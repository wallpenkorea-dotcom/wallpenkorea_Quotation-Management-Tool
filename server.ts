import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { parseExcelEstimate } from './server/excelParser';
import { ProjectDatabase, UPLOADS_DIR, generateToken, getDefaultPublicSettings } from './server/db';
import { generateSampleExcelBuffer } from './server/sampleExcel';
import { FileType, ProjectFile } from './src/types';

// Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // Generate clean unique filename preserving extension
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, uniqueName);
  },
});

// Max 100MB file limit as requested
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.xlsx', '.xls', '.pdf', '.jpg', '.jpeg', '.png', '.webp'];
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`지원되지 않는 파일 형식입니다 (${ext}). 허용 형식: JPG, PNG, WEBP, XLSX, XLS, PDF`));
    }
  },
});

// Memory storage for immediate excel parsing
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Static serving for uploaded files
  app.use('/uploads', express.static(UPLOADS_DIR));

  // 1. Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'WallPen Estimate Management API' });
  });

  // 2. Auth endpoints (Strict admin authentication: wallpenkorea@gmail.com / wallpen1661!)
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    if (
      (cleanEmail === 'wallpenkorea@gmail.com' || cleanEmail === 'admin@wallpen.co.kr') &&
      cleanPassword === 'wallpen1661!'
    ) {
      return res.json({
        success: true,
        user: {
          id: 'admin-1',
          email: 'wallpenkorea@gmail.com',
          name: '월펜 관리자',
          role: 'admin',
        },
        token: 'auth_token_' + Date.now(),
      });
    }

    return res.status(401).json({
      success: false,
      message: '이메일 또는 비밀번호가 일치하지 않습니다.',
    });
  });

  // 3. Excel parsing endpoint (Takes uploaded Excel buffer & returns extracted fields with AI learning)
  app.post('/api/projects/parse-excel', memoryUpload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ error: '엑셀 파일이 첨부되지 않았습니다.' });
      }

      const { extracted, sheetNames } = await parseExcelEstimate(req.file.buffer);

      // Also save the uploaded excel to uploads directory as original quote file
      const ext = path.extname(req.file.originalname).toLowerCase();
      const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
      const filePath = path.join(UPLOADS_DIR, filename);
      fs.writeFileSync(filePath, req.file.buffer);

      const savedFileInfo: ProjectFile = {
        id: 'file-' + Date.now().toString(36),
        projectId: '',
        originalName: req.file.originalname,
        filename: filename,
        fileType: '원본 엑셀 견적서',
        fileSize: req.file.size,
        mimeType: req.file.mimetype || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        uploadedAt: new Date().toISOString(),
        isPublic: false,
        url: `/uploads/${filename}`,
      };

      return res.json({
        success: true,
        extracted,
        sheetNames,
        originalFile: savedFileInfo,
      });
    } catch (err: any) {
      console.error('Excel parse error:', err);
      return res.status(500).json({
        error: '엑셀 견적서 분석 중 오류가 발생했습니다: ' + (err.message || '알 수 없는 오류'),
      });
    }
  });

  // 4. Sample Excel Template Download
  app.get('/api/projects/sample-template', (req, res) => {
    try {
      const buffer = generateSampleExcelBuffer();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="Wallpen_Sample_Estimate.xlsx"');
      res.send(buffer);
    } catch (e: any) {
      res.status(500).json({ error: '샘플 엑셀 생성 실패' });
    }
  });

  // 5. Projects CRUD
  app.get('/api/projects', (req, res) => {
    const { search, status, paymentStatus } = req.query;
    const list = ProjectDatabase.list(
      typeof search === 'string' ? search : undefined,
      typeof status === 'string' ? status : undefined,
      typeof paymentStatus === 'string' ? paymentStatus : undefined
    );
    res.json(list);
  });

  app.get('/api/projects/:id', (req, res) => {
    const project = ProjectDatabase.getById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: '현장 정보를 찾을 수 없습니다.' });
    }
    res.json(project);
  });

  app.post('/api/projects', (req, res) => {
    try {
      const body = req.body;
      if (!body.projectName || !body.projectName.trim()) {
        return res.status(400).json({ error: '현장명은 필수 입력 항목입니다.' });
      }

      const newProject = ProjectDatabase.create({
        projectName: body.projectName.trim(),
        customerName: body.customerName || '',
        customerPhone: body.customerPhone || '',
        address: body.address || '',
        managerName: body.managerName || '',
        managerPhone: body.managerPhone || '',
        quoteDate: body.quoteDate || new Date().toISOString().split('T')[0],
        scheduledDate: body.scheduledDate || '',
        completedDate: body.completedDate || '',
        constructionDetails: body.constructionDetails || '',
        wallMaterial: body.wallMaterial || '',
        printWidthMm: body.printWidthMm ? Number(body.printWidthMm) : null,
        printHeightMm: body.printHeightMm ? Number(body.printHeightMm) : null,
        printAreaM2: body.printAreaM2 ? Number(body.printAreaM2) : null,
        useWhiteInk: Boolean(body.useWhiteInk),
        specialNotes: body.specialNotes || '',
        supplyAmount: Number(body.supplyAmount) || 0,
        taxAmount: Number(body.taxAmount) || 0,
        totalAmount: Number(body.totalAmount) || 0,
        depositAmount: Number(body.depositAmount) || 0,
        balanceAmount: Number(body.balanceAmount) || 0,
        depositPaid: Boolean(body.depositPaid),
        balancePaid: Boolean(body.balancePaid),
        depositDueDate: body.depositDueDate || '',
        paymentMemo: body.paymentMemo || '',
        status: body.status || '견적 작성',
        paymentStatus: body.paymentStatus || '미청구',
        internalMemo: body.internalMemo || '',
        files: Array.isArray(body.files) ? body.files : [],
        publicSettings: body.publicSettings || getDefaultPublicSettings(),
        isShareActive: body.isShareActive !== undefined ? Boolean(body.isShareActive) : true,
      });

      res.status(201).json(newProject);
    } catch (err: any) {
      console.error('Project create error:', err);
      res.status(500).json({ error: '현장 등록 중 오류가 발생했습니다.' });
    }
  });

  app.put('/api/projects/:id', (req, res) => {
    try {
      const updated = ProjectDatabase.update(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: '현장 정보를 찾을 수 없습니다.' });
      }
      res.json(updated);
    } catch (err: any) {
      console.error('Project update error:', err);
      res.status(500).json({ error: '현장 정보 수정 중 오류가 발생했습니다.' });
    }
  });

  app.delete('/api/projects/:id', (req, res) => {
    const success = ProjectDatabase.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ error: '삭제할 현장을 찾을 수 없습니다.' });
    }
    res.json({ success: true, message: '현장이 삭제되었습니다.' });
  });

  // 6. File Uploads for a Project (Supports multiple files up to 100MB each)
  app.post('/api/projects/:id/files', upload.array('files', 10), (req: Request, res: Response) => {
    try {
      const projectId = req.params.id;
      const project = ProjectDatabase.getById(projectId);
      if (!project) {
        return res.status(404).json({ error: '현장을 찾을 수 없습니다.' });
      }

      const uploadedFiles = req.files as Express.Multer.File[];
      if (!uploadedFiles || uploadedFiles.length === 0) {
        return res.status(400).json({ error: '업로드할 파일이 없습니다.' });
      }

      const defaultFileType = (req.body.fileType as FileType) || '기타 파일';
      const isPublic = req.body.isPublic === 'true' || req.body.isPublic === true;

      const newFiles: ProjectFile[] = uploadedFiles.map((f) => ({
        id: 'file-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        projectId,
        originalName: Buffer.from(f.originalname, 'latin1').toString('utf8'), // Fix Korean encoding if needed
        filename: f.filename,
        fileType: defaultFileType,
        fileSize: f.size,
        mimeType: f.mimetype,
        uploadedAt: new Date().toISOString(),
        isPublic: isPublic,
        url: `/uploads/${f.filename}`,
      }));

      const existingFiles = project.files || [];
      const updatedProject = ProjectDatabase.update(projectId, {
        files: [...existingFiles, ...newFiles],
      });

      res.json({
        success: true,
        project: updatedProject,
        addedFiles: newFiles,
      });
    } catch (err: any) {
      console.error('File upload error:', err);
      res.status(500).json({ error: '파일 업로드 실패: ' + err.message });
    }
  });

  app.patch('/api/projects/:id/files/:fileId', (req, res) => {
    const { id, fileId } = req.params;
    const updates = req.body;
    const updated = ProjectDatabase.updateFile(id, fileId, updates);
    if (!updated) {
      return res.status(404).json({ error: '파일 정보를 업데이트할 수 없습니다.' });
    }
    res.json(updated);
  });

  app.delete('/api/projects/:id/files/:fileId', (req, res) => {
    const { id, fileId } = req.params;
    const updated = ProjectDatabase.deleteFile(id, fileId);
    if (!updated) {
      return res.status(404).json({ error: '파일을 삭제할 수 없습니다.' });
    }
    res.json(updated);
  });

  // Admin download file
  app.get('/api/files/:filename/download', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(UPLOADS_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
    }
    res.download(filePath);
  });

  // 7. Share Controls
  app.post('/api/projects/:id/share/toggle', (req, res) => {
    const { active } = req.body;
    const updated = ProjectDatabase.toggleShare(req.params.id, active);
    if (!updated) {
      return res.status(404).json({ error: '현장을 찾을 수 없습니다.' });
    }
    res.json(updated);
  });

  app.post('/api/projects/:id/share/regenerate', (req, res) => {
    const result = ProjectDatabase.regenerateShareToken(req.params.id);
    if (!result) {
      return res.status(404).json({ error: '현장을 찾을 수 없습니다.' });
    }
    res.json(result);
  });

  // 8. Public Share Endpoints (No Auth Required, Strictly Sanitized)
  app.get('/api/public/share/:token', (req, res) => {
    const token = req.params.token;
    const result = ProjectDatabase.getSanitizedPublicView(token);

    if (result.error === 'NOT_FOUND') {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: '유효하지 않거나 존재하지 않는 공유 링크입니다.',
      });
    }

    if (result.error === 'SHARE_INACTIVE') {
      return res.status(403).json({
        error: 'SHARE_INACTIVE',
        message: '현재 공유가 중지된 페이지입니다.',
      });
    }

    res.json(result.data);
  });

  // Public view image file stream (only if public)
  app.get('/api/public/files/:token/:fileId/view', (req, res) => {
    const { token, fileId } = req.params;
    const project = ProjectDatabase.getByShareToken(token);
    if (!project || !project.isShareActive) {
      return res.status(403).send('접근 권한이 없습니다.');
    }

    const file = (project.files || []).find((f) => f.id === fileId && f.isPublic);
    if (!file) {
      return res.status(404).send('공개된 파일을 찾을 수 없습니다.');
    }

    const filePath = path.join(UPLOADS_DIR, file.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('파일이 존재하지 않습니다.');
    }

    res.sendFile(filePath);
  });

  // Public download file stream (only if public)
  app.get('/api/public/files/:token/:fileId/download', (req, res) => {
    const { token, fileId } = req.params;
    const project = ProjectDatabase.getByShareToken(token);
    if (!project || !project.isShareActive) {
      return res.status(403).send('접근 권한이 없습니다.');
    }

    const file = (project.files || []).find((f) => f.id === fileId && f.isPublic);
    if (!file) {
      return res.status(404).send('공개된 파일을 찾을 수 없습니다.');
    }

    const filePath = path.join(UPLOADS_DIR, file.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('파일이 존재하지 않습니다.');
    }

    res.download(filePath, file.originalName);
  });

  // Error handling middleware for Multer and others
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: '파일 용량이 제한(100MB)을 초과했습니다.' });
      }
      return res.status(400).json({ error: '파일 업로드 오류: ' + err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message || '서버 요청 처리 실패' });
    }
    next();
  });

  // Vite middleware for dev / static for prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WallPen Estimate Management Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
