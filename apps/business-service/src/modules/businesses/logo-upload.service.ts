import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getConfig } from "../../config/config";
import { AppError } from "../../http/errors";
import { getR2Client } from "../../storage/r2-client";

const ALLOWED_LOGO_TYPES = new Set([
	"image/png",
	"image/jpeg",
	"image/webp",
	"image/svg+xml",
]);
const LOGO_UPLOAD_EXPIRES_SECONDS = 300;

function extensionForContentType(contentType: string) {
	switch (contentType) {
		case "image/png":
			return "png";
		case "image/jpeg":
			return "jpg";
		case "image/webp":
			return "webp";
		case "image/svg+xml":
			return "svg";
		default:
			return "bin";
	}
}

function getLogoR2Client() {
	const config = getConfig();
	if (!config.r2) {
		throw new AppError(
			"LOGO_UPLOAD_NOT_CONFIGURED",
			503,
			"Logo upload is not configured.",
		);
	}

	return { client: getR2Client(config.r2), r2: config.r2 };
}

export async function createBusinessLogoUpload(
	ownerUserId: string,
	contentType: string,
) {
	if (!ALLOWED_LOGO_TYPES.has(contentType)) {
		throw new AppError(
			"UNSUPPORTED_LOGO_TYPE",
			400,
			"Logo must be PNG, JPG, WebP, or SVG.",
		);
	}

	const { client, r2 } = getLogoR2Client();
	const objectKey = `business-logos/${ownerUserId}/${crypto.randomUUID()}.${extensionForContentType(contentType)}`;
	const command = new PutObjectCommand({
		Bucket: r2.bucket,
		Key: objectKey,
		ContentType: contentType,
	});
	const uploadUrl = await getSignedUrl(client, command, {
		expiresIn: LOGO_UPLOAD_EXPIRES_SECONDS,
	});

	return {
		uploadUrl,
		publicUrl: `${r2.publicBaseUrl}/${objectKey}`,
		objectKey,
		expiresIn: LOGO_UPLOAD_EXPIRES_SECONDS,
		headers: { "Content-Type": contentType },
	};
}
