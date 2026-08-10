"use client";

import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams, useRouter } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { AuthGuard } from "@/components/auth-guard";
import { useSession } from "@/hooks/use-session";
import {
	useBusiness,
	useCreateBusinessLogoUpload,
	useUpdateBusiness,
} from "@/lib/queries/onboarding";
import {
	businessSettingsSchema,
	type BusinessSettingsValues,
} from "@/lib/validation/onboarding-schemas";
import { Button } from "@/components/ui/button";
import { CollaboratorsSettings } from "@/components/dashboard/collaborators-settings";
import { PaymentMethodsSettings } from "@/components/dashboard/payment-methods-settings";
import { OikentraLoader } from "@/components/ui/oikentra-loader";
import { BusinessLogo } from "@/components/business-logo";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";

export default function BusinessSettings() {
	return (
		<AuthGuard>
			<BusinessSettingsContent />
		</AuthGuard>
	);
}

function BusinessSettingsContent() {
	const { user } = useSession();
	const { businessId } = useParams<{ businessId: string }>();
	const router = useRouter();
	const { data: business, isLoading, error } = useBusiness(businessId);
	const updateBusinessMutation = useUpdateBusiness();
	const logoUploadMutation = useCreateBusinessLogoUpload();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const form = useForm<BusinessSettingsValues>({
		resolver: zodResolver(businessSettingsSchema),
		defaultValues: {
			name: "",
			businessType: "OTHER",
			description: "",
			logoUrl: null,
			logoObjectKey: null,
			currencyCode: "COP",
			timezone: "America/Bogota",
		},
	});

	const fetchErrorMessage = error ? "No pudimos cargar este negocio." : "";

	useEffect(() => {
		if (business) {
			form.reset({
				name: business.name,
				businessType:
					(business.businessType as BusinessSettingsValues["businessType"]) ||
					"OTHER",
				description: business.description ?? "",
				logoUrl: business.logoUrl ?? null,
				logoObjectKey: business.logoObjectKey ?? null,
				currencyCode: business.currencyCode || "COP",
				timezone: business.timezone || "America/Bogota",
			});
		}
	}, [business, form]);

	async function handleLogoUpload(file: File) {
		if (
			!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(
				file.type,
			)
		) {
			throw new Error("Sube un logo en PNG, JPG, WebP o SVG.");
		}
		if (file.size > 2 * 1024 * 1024) {
			throw new Error("El logo debe pesar máximo 2 MB.");
		}

		const upload = await logoUploadMutation.mutateAsync(file.type);
		const url = new URL(upload.uploadUrl);
		if (
			url.protocol !== "https:" ||
			!url.hostname.endsWith(".r2.cloudflarestorage.com")
		) {
			throw new Error("La URL para subir el logo no es válida.");
		}

		const response = await fetch(url.toString(), {
			method: "PUT",
			headers: upload.headers,
			body: file,
		});
		if (!response.ok) {
			throw new Error("No pudimos subir el logo. Intenta con otra imagen.");
		}

		form.setValue("logoUrl", upload.publicUrl, { shouldDirty: true });
		form.setValue("logoObjectKey", upload.objectKey, { shouldDirty: true });
	}

	function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		if (!file) return;
		handleLogoUpload(file).catch((cause) => {
			toast.add({
				type: "error",
				title: "Error al subir el logo",
				description:
					cause instanceof Error
						? cause.message
						: "No pudimos subir el logo. Inténtalo de nuevo.",
			});
		});
		event.target.value = "";
	}

	function handleRemoveLogo() {
		form.setValue("logoUrl", null, { shouldDirty: true });
		form.setValue("logoObjectKey", null, { shouldDirty: true });
	}

	async function submit(values: BusinessSettingsValues) {
		try {
			const updated = await updateBusinessMutation.mutateAsync({
				id: businessId,
				input: values,
			});
			form.reset({
				name: updated.name,
				businessType:
					(updated.businessType as BusinessSettingsValues["businessType"]) ||
					"OTHER",
				description: updated.description ?? "",
				logoUrl: updated.logoUrl ?? null,
				logoObjectKey: updated.logoObjectKey ?? null,
				currencyCode: updated.currencyCode || "COP",
				timezone: updated.timezone || "America/Bogota",
			});
			toast.add({
				type: "success",
				title: "Cambios guardados",
				description: "La información del negocio se actualizó correctamente.",
			});
		} catch (cause) {
			toast.add({
				type: "error",
				title: "No pudimos guardar los cambios",
				description:
					cause instanceof Error
						? cause.message
						: "Inténtalo nuevamente en unos segundos.",
				priority: "high",
			});
		}
	}
	if (isLoading)
		return (
			<OikentraLoader label="Cargando configuración" className="min-h-[60vh]" />
		);
	if (!business || !user)
		return (
			<div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-20 text-center">
				<p className="text-muted-foreground">{fetchErrorMessage}</p>
				<Button onClick={() => router.push("/dashboard")}>
					Volver a mis negocios
				</Button>
			</div>
		);
	return (
		<DashboardShell business={business} user={user}>
			<div className="mx-auto max-w-5xl space-y-6">
				<div>
					<p className="text-sm font-medium ">Configuración</p>
					<h1 className="mt-2 text-3xl font-semibold tracking-tight">
						Configura tu negocio
					</h1>
					<p className="mt-2 text-muted-foreground">
						Estos datos ayudan a que Oikentra se adapte a tu forma de trabajar.
					</p>
				</div>
				<Card className="overflow-hidden">
					<CardHeader>
						<CardTitle>Información general</CardTitle>
						<CardDescription>
							Actualiza los datos básicos del espacio actual.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Form {...form}>
							<form
								className="grid gap-5 lg:grid-cols-2"
								onSubmit={form.handleSubmit(submit)}
							>
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Nombre del negocio</FormLabel>
											<FormControl>
												<Input {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="businessType"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Tipo de negocio</FormLabel>
											<FormControl>
												<Select
													value={field.value}
													onValueChange={field.onChange}
												>
													<SelectTrigger>
														<SelectValue placeholder="Tipo de negocio" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="STORE">Tienda</SelectItem>
														<SelectItem value="RESTAURANT">
															Restaurante
														</SelectItem>
														<SelectItem value="OTHER">Otro</SelectItem>
													</SelectContent>
												</Select>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="description"
									render={({ field }) => (
										<FormItem className="lg:col-span-2">
											<FormLabel>Descripción</FormLabel>
											<FormControl>
												<Input
													{...field}
													value={field.value ?? ""}
													maxLength={280}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="logoUrl"
									render={({ field }) => (
										<FormItem className="lg:col-span-2">
											<FormLabel>Logo del negocio</FormLabel>
											<FormControl>
												<div className="flex items-center gap-4">
													<BusinessLogo
														business={{
															name: business.name,
															logoUrl: field.value,
														}}
														className="size-16"
													/>
													<input
														ref={fileInputRef}
														type="file"
														accept="image/png,image/jpeg,image/webp,image/svg+xml"
														className="hidden"
														onChange={handleFileChange}
													/>
													<div className="flex flex-wrap items-center gap-2">
														<Button
															type="button"
															variant="outline"
															onClick={() => fileInputRef.current?.click()}
															disabled={logoUploadMutation.isPending}
														>
															{logoUploadMutation.isPending
																? "Subiendo..."
																: field.value
																	? "Cambiar logo"
																	: "Subir logo"}
														</Button>
														{field.value ? (
															<Button
																type="button"
																variant="ghost"
																onClick={handleRemoveLogo}
															>
																Eliminar
															</Button>
														) : null}
													</div>
												</div>
											</FormControl>
											<FormDescription>
												PNG, JPG, WebP o SVG. Máximo 2 MB.
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
								<div className="grid gap-5 sm:grid-cols-2 lg:col-span-2">
									<FormField
										control={form.control}
										name="currencyCode"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Moneda</FormLabel>
												<FormControl>
													<Input
														{...field}
														maxLength={3}
														onChange={(event) =>
															field.onChange(event.target.value.toUpperCase())
														}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="timezone"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Zona horaria</FormLabel>
												<FormControl>
													<Input {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
								<Button
									type="submit"
									className="w-fit"
									disabled={form.formState.isSubmitting}
								>
									{form.formState.isSubmitting
										? "Guardando..."
										: "Guardar cambios"}
								</Button>
							</form>
						</Form>
					</CardContent>
				</Card>
				<PaymentMethodsSettings businessId={businessId} />
				<CollaboratorsSettings businessId={businessId} />
			</div>
		</DashboardShell>
	);
}
