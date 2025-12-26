import { publicProcedure, router } from "../index";
import { documentRouter } from "./document";
import { todoRouter } from "./todo";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => {
		return "OK";
	}),
	todo: todoRouter,
	document: documentRouter,
});
export type AppRouter = typeof appRouter;
