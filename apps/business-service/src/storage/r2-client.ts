import {
	DeleteObjectCommand,
	GetObjectCommand,
	HeadObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getConfig } from "../config/config";
import { AppError } from "../http/errors";

type R2Credentials = {
	accountId: string;
	accessKeyId: string;
	secretAccessKey: string;
};

const clients = new Map<string, S3Client>();

export function getR2Client({
	accountId,
	accessKeyId,
	secretAccessKey,
}: R2Credentials) {
	const cacheKey = `${accountId}:${accessKeyId}`;
	let client = clients.get(cacheKey);
	if (!client) {
		client = new S3Client({
			region: "auto",
			endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
			credentials: { accessKeyId, secretAccessKey },
		});
		clients.set(cacheKey, client);
	}
	return client;
}

export type PrivateObjectStorage = {
	signUpload(input: {
		key: string;
		contentType: string;
		sizeBytes: number;
		expiresIn: number;
	}): Promise<string>;
	signDownload(input: {
		key: string;
		fileName: string;
		contentType: string;
		expiresIn: number;
	}): Promise<string>;
	head(key: string): Promise<{ sizeBytes: number; contentType: string | undefined } | null>;
	readStart(key: string, length: number): Promise<Uint8Array>;
	delete(key: string): Promise<void>;
};

function getPrivateBucket() {
	const config = getConfig().r2PrivateBucket;
	if (!config) {
		throw new AppError(
			"TASK_ATTACHMENTS_NOT_CONFIGURED",
			503,
			"Task attachments are not configured.",
		);
	}
	return { client: getR2Client(config), bucket: config.bucket };
}

function isMissingObject(error: unknown) {
	const candidate = error as {
		name?: string;
		$metadata?: { httpStatusCode?: number };
	};
	return (
		candidate?.name === "NotFound" ||
		candidate?.name === "NoSuchKey" ||
		candidate?.$metadata?.httpStatusCode === 404
	);
}

export function createPrivateObjectStorage(): PrivateObjectStorage {
	return {
		async signUpload({ key, contentType, sizeBytes, expiresIn }) {
			const { client, bucket } = getPrivateBucket();
			return getSignedUrl(
				client,
				new PutObjectCommand({
					Bucket: bucket,
					Key: key,
					ContentType: contentType,
					ContentLength: sizeBytes,
				}),
				{
					expiresIn,
					signableHeaders: new Set(["content-type", "content-length"]),
				},
			);
		},

		async signDownload({ key, fileName, contentType, expiresIn }) {
			const { client, bucket } = getPrivateBucket();
			return getSignedUrl(
				client,
				new GetObjectCommand({
					Bucket: bucket,
					Key: key,
					ResponseContentType: contentType,
					ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
				}),
				{ expiresIn },
			);
		},

		async head(key) {
			const { client, bucket } = getPrivateBucket();
			try {
				const result = await client.send(
					new HeadObjectCommand({ Bucket: bucket, Key: key }),
				);
				return {
					sizeBytes: result.ContentLength ?? -1,
					contentType: result.ContentType,
				};
			} catch (error) {
				if (isMissingObject(error)) return null;
				throw error;
			}
		},

		async readStart(key, length) {
			const { client, bucket } = getPrivateBucket();
			const result = await client.send(
				new GetObjectCommand({
					Bucket: bucket,
					Key: key,
					Range: `bytes=0-${length - 1}`,
				}),
			);
			return (
				(await result.Body?.transformToByteArray()) ?? new Uint8Array()
			);
		},

		async delete(key) {
			const { client, bucket } = getPrivateBucket();
			await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
		},
	};
}

export const privateObjectStorage = createPrivateObjectStorage();
