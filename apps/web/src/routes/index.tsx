import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { trpc } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

function HomeComponent() {
	const healthCheck = useQuery(trpc.healthCheck.queryOptions());

	return (
		<div className="container mx-auto max-w-5xl px-4 py-8">
			<div className="text-center mb-12">
				<h1 className="text-4xl font-bold mb-4">POD Receipt OCR System</h1>
				<p className="text-xl text-muted-foreground">
					Automated handwritten document extraction using Google Gemini 2.0 Flash Preview
				</p>
			</div>

			<div className="grid md:grid-cols-3 gap-6 mb-8">
				<Card>
					<CardHeader>
						<CardTitle>📄 Upload Documents</CardTitle>
						<CardDescription>Upload PDF receipts for processing</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-sm mb-4">
							Upload proof of delivery receipts in PDF format. The system supports
							handwritten documents and automatically extracts container information,
							dates, locations, and more.
						</p>
						<Link to="/documents">
							<Button className="w-full">Go to Upload</Button>
						</Link>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>🤖 AI Powered OCR</CardTitle>
						<CardDescription>Gemini 2.0 Flash Preview</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-sm mb-4">
							Powered by Google's latest Gemini 2.0 Flash Preview model with advanced
							OCR capabilities for handwritten text recognition and structured data
							extraction.
						</p>
						<ul className="text-sm space-y-1">
							<li>✓ Multi-page support</li>
							<li>✓ Handwritten text</li>
							<li>✓ Real-time processing</li>
						</ul>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>📊 Structured Data</CardTitle>
						<CardDescription>Automatic field extraction</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-sm mb-4">
							Automatically extracts and structures:
						</p>
						<ul className="text-sm space-y-1">
							<li>• Container numbers & sizes</li>
							<li>• Full/Empty status</li>
							<li>• Dates and locations</li>
							<li>• Vehicle information</li>
							<li>• Instruction numbers</li>
						</ul>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>System Status</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<div
								className={`h-3 w-3 rounded-full ${healthCheck.data ? "bg-green-500" : "bg-red-500"}`}
							/>
							<span className="font-medium">
								{healthCheck.isLoading
									? "Checking..."
									: healthCheck.data
										? "API Connected"
										: "API Disconnected"}
							</span>
						</div>
						{healthCheck.data && (
							<span className="text-sm text-muted-foreground">
								Ready to process documents
							</span>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
