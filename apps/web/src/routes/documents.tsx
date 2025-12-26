import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/utils/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function DocumentUpload() {
	const [file, setFile] = useState<File | null>(null);
	const [uploading, setUploading] = useState(false);
	const [userId, setUserId] = useState<string>("");
	const [instructionNumber, setInstructionNumber] = useState("");
	const [uploadedDocId, setUploadedDocId] = useState<string | null>(null);

	// Fetch default user on mount
	useEffect(() => {
		fetch("http://localhost:3000/api/default-user")
			.then((res) => res.json())
			.then((user) => {
				setUserId(user.userId);
			})
			.catch((err) => console.error("Failed to fetch default user:", err));
	}, []);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			setFile(e.target.files[0]);
		}
	};

	const handleUpload = async () => {
		if (!file || !userId || !instructionNumber) {
			toast.error("Please fill all required fields");
			return;
		}

		setUploading(true);
		const formData = new FormData();
		formData.append("file", file);
		formData.append("userId", userId);
		formData.append("instructionNumber", instructionNumber);

		try {
			const response = await fetch("http://localhost:3000/api/upload-document", {
				method: "POST",
				body: formData,
			});

			const data = await response.json();

			if (response.ok) {
				toast.success("Document uploaded successfully! Processing started.");
				setUploadedDocId(data.documentId);
				setFile(null);
				setInstructionNumber("");
			} else {
				toast.error(data.error || "Upload failed");
			}
		} catch (error) {
			console.error("Upload error:", error);
			toast.error("Upload failed");
		} finally {
			setUploading(false);
		}
	};

	// Query for extraction status
	const { data: status, refetch: refetchStatus } = trpc.document.getExtractionStatus.useQuery(
		{ documentId: uploadedDocId || "" },
		{ enabled: !!uploadedDocId, refetchInterval: 2000 }
	);

	// Query for extracted data
	const { data: extractedData, refetch: refetchData } = trpc.document.getExtractedData.useQuery(
		{ documentId: uploadedDocId || "" },
		{ enabled: !!uploadedDocId && status?.status === "COMPLETED" }
	);

	// Query for documents list
	const { data: documents, refetch: refetchDocuments } = trpc.document.listDocuments.useQuery(
		{ limit: 10, offset: 0 },
		{ refetchInterval: 5000 }
	);

	return (
		<div className="container mx-auto p-6 space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">POD Receipt OCR</h1>
					<p className="text-muted-foreground">
						Upload proof of delivery receipts for automatic data extraction
					</p>
				</div>
			</div>

			{/* Upload Card */}
			<Card>
				<CardHeader>
					<CardTitle>Upload Document</CardTitle>
					<CardDescription>
						Upload a PDF proof of delivery receipt. Handwritten receipts are supported.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="instruction">Instruction Number *</Label>
						<Input
							id="instruction"
							placeholder="e.g., INS-2024-001"
							value={instructionNumber}
							onChange={(e) => setInstructionNumber(e.target.value)}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="file">PDF File *</Label>
						<Input
							id="file"
							type="file"
							accept="application/pdf"
							onChange={handleFileChange}
						/>
						{file && (
							<p className="text-sm text-muted-foreground">
								Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
							</p>
						)}
					</div>

					<Button
						onClick={handleUpload}
						disabled={uploading || !file || !instructionNumber}
						className="w-full"
					>
						{uploading ? "Uploading..." : "Upload & Process"}
					</Button>
				</CardContent>
			</Card>

			{/* Status Card */}
			{uploadedDocId && status && (
				<Card>
					<CardHeader>
						<CardTitle>Processing Status</CardTitle>
						<CardDescription>Document ID: {uploadedDocId}</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex items-center space-x-2">
							<div
								className={`w-3 h-3 rounded-full ${
									status.status === "PROCESSING"
										? "bg-yellow-500 animate-pulse"
										: status.status === "COMPLETED"
											? "bg-green-500"
											: status.status === "FAILED"
												? "bg-red-500"
												: "bg-gray-500"
								}`}
							/>
							<span className="font-medium">{status.status}</span>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Extracted Data Card */}
			{extractedData && extractedData.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Extracted Data</CardTitle>
						<CardDescription>{extractedData.length} page(s) processed</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{extractedData.map((page) => (
								<div key={page.extractedPageDataId} className="border rounded-lg p-4">
									<h3 className="font-semibold mb-2">Page {page.pageNumber}</h3>
									
									<div className="grid grid-cols-2 gap-4 text-sm">
										{page.instructionNumber && (
											<div>
												<span className="font-medium">Instruction:</span> {page.instructionNumber}
											</div>
										)}
										{page.pageDate && (
											<div>
												<span className="font-medium">Date:</span> {page.pageDate}
											</div>
										)}
										{page.vehicleNumber && (
											<div>
												<span className="font-medium">Vehicle:</span> {page.vehicleNumber}
											</div>
										)}
										{page.collectedFrom && (
											<div>
												<span className="font-medium">From:</span> {page.collectedFrom}
											</div>
										)}
										{page.deliveredTo && (
											<div>
												<span className="font-medium">To:</span> {page.deliveredTo}
											</div>
										)}
									</div>

									{page.containerNumbers && page.containerNumbers.length > 0 && (
										<div className="mt-4">
											<h4 className="font-medium mb-2">Containers:</h4>
											<div className="overflow-x-auto">
												<table className="w-full text-sm">
													<thead className="border-b">
														<tr>
															<th className="text-left p-2">Container #</th>
															<th className="text-left p-2">Size</th>
															<th className="text-left p-2">Status</th>
														</tr>
													</thead>
													<tbody>
														{page.containerNumbers.map((num, idx) => (
															<tr key={idx} className="border-b">
																<td className="p-2">{num || "N/A"}</td>
																<td className="p-2">{page.containerSizes?.[idx] || "N/A"}</td>
																<td className="p-2">
																	<span
																		className={`px-2 py-1 rounded text-xs ${
																			page.fullEmptyStatuses?.[idx] === "FULL"
																				? "bg-blue-100 text-blue-800"
																				: "bg-gray-100 text-gray-800"
																		}`}
																	>
																		{page.fullEmptyStatuses?.[idx] || "N/A"}
																	</span>
																</td>
															</tr>
														))}
													</tbody>
												</table>
											</div>
										</div>
									)}

									{page.unsureFields && page.unsureFields.length > 0 && (
										<div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
											<p className="text-sm font-medium text-yellow-800">
												Uncertain fields: {page.unsureFields.join(", ")}
											</p>
										</div>
									)}
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Recent Documents */}
			{documents && documents.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Recent Documents</CardTitle>
						<CardDescription>Last 10 uploaded documents</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							{documents.map((doc) => (
								<div
									key={doc.documentId}
									className="flex items-center justify-between p-3 border rounded hover:bg-gray-50 cursor-pointer"
									onClick={() => setUploadedDocId(doc.documentId)}
								>
									<div>
										<p className="font-medium">{doc.documentName}</p>
										<p className="text-sm text-muted-foreground">
											{doc.instructionNumber} • {new Date(doc.createdAt).toLocaleDateString()}
										</p>
									</div>
									<div
										className={`px-3 py-1 rounded text-sm ${
											doc.extractionStatus === "COMPLETED"
												? "bg-green-100 text-green-800"
												: doc.extractionStatus === "PROCESSING"
													? "bg-yellow-100 text-yellow-800"
													: doc.extractionStatus === "FAILED"
														? "bg-red-100 text-red-800"
														: "bg-gray-100 text-gray-800"
										}`}
									>
										{doc.extractionStatus}
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
