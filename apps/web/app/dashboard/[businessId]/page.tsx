"use client";

import { redirect, useParams } from "next/navigation";

export default function Page() {
	const { businessId } = useParams<{ businessId: string }>();
	redirect(`/dashboard/${businessId}/resumen-general`);
}
