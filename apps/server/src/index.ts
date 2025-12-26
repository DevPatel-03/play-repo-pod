import "dotenv/config";
import { google } from "@ai-sdk/google";
import { createContext } from "@my-better-t-app/api/context";
import { appRouter } from "@my-better-t-app/api/routers/index";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import cors from "cors";
import express from "express";

const app = express();

app.use(
	cors({
		origin: process.env.CORS_ORIGIN || "",
		methods: ["GET", "POST", "OPTIONS", "PUT"],
	}),
);

app.use(
	"/trpc",
	createExpressMiddleware({
		router: appRouter,
		createContext,
	}),
);

app.use(express.json());

app.post("/ai", async (req, res) => {
	const { messages = [] } = (req.body || {}) as { messages: UIMessage[] };
	const result = streamText({
		model: google("gemini-3-pro-preview"),
		messages: convertToModelMessages(messages),
	});
	result.pipeUIMessageStreamToResponse(res);
});

app.get("/", (_req, res) => {
	res.status(200).send("OK");
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
	console.log(`Server is running on port ${port}`);
});
