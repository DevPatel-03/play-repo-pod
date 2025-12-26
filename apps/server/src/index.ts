import "dotenv/config";
import { google } from "@ai-sdk/google";
import { createContext } from "@my-better-t-app/api/context";
import { appRouter } from "@my-better-t-app/api/routers/index";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import cors from "cors";
import express from "express";
import multer from "multer";
import { db } from "@my-better-t-app/db";
import { uploadDocuments, users } from "@my-better-t-app/db/schema";
import { extractPODDataFromPDF } from "@my-better-t-app/api/services/ocr-extraction";

const app = express();

app.use(
	cors({
		origin: process.env.CORS_ORIGIN || "*",
		methods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
	}),
);

app.use(
	"/trpc",
	createExpressMiddleware({
		router: appRouter,
		createContext,
	}),
);

app.use(express.json({ limit: "50mb" }));

// Configure multer for file uploads
const upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 10 * 1024 * 1024, // 10MB limit
	},
	fileFilter: (_req, file, cb) => {
		if (file.mimetype === "application/pdf") {
			cb(null, true);
		} else {
			cb(new Error("Only PDF files are allowed"));
		}
	},
});

// File upload endpoint for POD receipts
app.post("/api/upload-document", upload.single("file"), async (req, res) => {
	try {
		const file = req.file;
		if (!file) {
			return res.status(400).json({ error: "No file uploaded" });
		}

		const { userId, instructionNumber, companyId, branchId } = req.body;

		// Validate required fields
		if (!userId || !instructionNumber) {
			return res.status(400).json({
				error: "Missing required fields: userId and instructionNumber",
			});
		}

		console.log(`Uploading document: ${file.originalname} (${file.size} bytes)`);

		// Create document record
		const [document] = await db
			.insert(uploadDocuments)
			.values({
				userId: userId,
				instructionNumber: instructionNumber,
				documentName: file.originalname,
				fileUrl: `memory://${file.originalname}`, // Not storing file, just reference
				fileSizeInBytes: file.size,
				companyId: companyId || null,
				branchId: branchId || null,
				extractionStatus: "IDEAL",
			})
			.returning();

		console.log(`Document created: ${document.documentId}`);

		// Process PDF asynchronously (fire and forget)
		extractPODDataFromPDF(document.documentId, file.buffer, db).catch(
			(err) => {
				console.error("OCR processing failed:", err);
			},
		);

		res.json({
			success: true,
			documentId: document.documentId,
			message: "Document uploaded successfully. Processing started.",
		});
	} catch (error) {
		console.error("Upload error:", error);
		res.status(500).json({
			error: "Upload failed",
			message: error instanceof Error ? error.message : "Unknown error",
		});
	}
});

// Get or create default user
app.get("/api/default-user", async (_req, res) => {
	try {
		// Try to find existing user
		let user = await db.query.users.findFirst({
			where: (users, { eq }) => eq(users.email, "admin@pod-ocr.com"),
		});

		// Create default user if not exists
		if (!user) {
			const [newUser] = await db
				.insert(users)
				.values({
					email: "admin@pod-ocr.com",
					name: "Admin User",
				})
				.returning();
			user = newUser;
		}

		res.json(user);
	} catch (error) {
		console.error("Error getting default user:", error);
		res.status(500).json({ error: "Failed to get default user" });
	}
});

app.post("/ai", async (req, res) => {
	const { messages = [] } = (req.body || {}) as { messages: UIMessage[] };
	const result = streamText({
		model: google("gemini-2.0-flash-exp"),
		messages: convertToModelMessages(messages),
	});
	result.pipeUIMessageStreamToResponse(res);
});

app.get("/", (_req, res) => {
	res.status(200).send("POD OCR API - Ready");
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
	console.log(`Server is running on port ${port}`);
	console.log(`Upload endpoint: http://localhost:${port}/api/upload-document`);
	console.log(`Health check: http://localhost:${port}/`);
});
