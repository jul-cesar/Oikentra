"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { lookupPublicUser } from "@/lib/members-api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import {
	useCreateInvitation,
	useInvitations,
	useMembers,
	useRemoveMember,
	useRevokeInvitation,
	useUpdateMemberRole,
	usePublicUsers,
} from "@/lib/queries/members";
import {
	invitationFormSchema,
	type InvitationFormValues,
} from "@/lib/validation/members-schemas";

const invitationStatusLabel: Record<string, string> = {
	PENDING: "Pendiente",
	ACCEPTED: "Aceptada",
	REVOKED: "Revocada",
	EXPIRED: "Expirada",
};

export function CollaboratorsSettings({ businessId }: { businessId: string }) {
	const [message, setMessage] = useState<string | null>(null);
	const members = useMembers(businessId);
	const memberIds = (members.data ?? []).map((member) => member.userId);
	const profiles = usePublicUsers(memberIds);
	const invitations = useInvitations(businessId);
	const create = useCreateInvitation(businessId);
	const revoke = useRevokeInvitation(businessId);
	const updateRole = useUpdateMemberRole(businessId);
	const remove = useRemoveMember(businessId);
	const form = useForm<InvitationFormValues>({
		resolver: zodResolver(invitationFormSchema),
		defaultValues: { identifier: "", role: "OPERATOR" },
	});
	async function submit(values: InvitationFormValues) {
		try {
			const matches = await lookupPublicUser(values.identifier);
			if (!matches.length) {
				form.setError("identifier", {
					message: "No encontramos una cuenta con ese correo o teléfono.",
				});
				return;
			}
			await create.mutateAsync({ ...values, targetUserId: matches[0].id });
			form.reset();
			setMessage("Invitación creada correctamente.");
		} catch (cause) {
			form.setError("root.server", {
				message:
					cause instanceof Error
						? cause.message
						: "No pudimos crear la invitación.",
			});
		}
	}
	return (
		<Card className="mt-6">
			<CardHeader>
				<CardTitle>Colaboradores</CardTitle>
				<CardDescription>
					Invita a alguien por correo o teléfono y define qué puede hacer en
					este negocio.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				{message ? (
					<p className="text-sm text-primary" role="status">
						{message}
					</p>
				) : null}
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(submit)}
						className="grid gap-4 rounded-xl border bg-muted/20 p-4 sm:grid-cols-[1fr_180px_auto]"
					>
						<FormField
							control={form.control}
							name="identifier"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Correo o teléfono</FormLabel>
									<FormControl>
										<Input
											{...field}
											placeholder="persona@correo.com o 3001234567"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="role"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Rol</FormLabel>
									<FormControl>
										<select
											{...field}
											className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
										>
											<option value="OPERATOR">Operador</option>
											<option value="MANAGER">Administrador</option>
										</select>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<Button
							type="submit"
							className="self-end"
							disabled={create.isPending}
						>
							{create.isPending ? "Enviando…" : "Invitar"}
						</Button>
						{form.formState.errors.root?.server?.message ? (
							<p className="text-sm text-destructive sm:col-span-3">
								{form.formState.errors.root.server.message}
							</p>
						) : null}
					</form>
				</Form>
				{members.data?.length ? (
					<section>
						<h3 className="mb-2 text-sm font-medium">Miembros activos</h3>
						<div className="divide-y rounded-lg border">
							{members.data.map((member) => (
								<div
									key={member.id}
									className="flex items-center justify-between gap-3 p-3 text-sm"
								>
									<div className="flex min-w-0 items-center gap-3">
										<Avatar>
											<AvatarImage
												src={
													profiles.data?.find(
														(profile) => profile.id === member.userId,
													)?.image ?? undefined
												}
												alt=""
											/>
											<AvatarFallback>
												{(
													profiles.data?.find(
														(profile) => profile.id === member.userId,
													)?.name ?? member.userId
												)
													.slice(0, 2)
													.toUpperCase()}
											</AvatarFallback>
										</Avatar>
										<div className="min-w-0">
											<p className="font-medium">
												{member.role === "OWNER"
													? "Propietario"
													: (profiles.data?.find(
															(profile) => profile.id === member.userId,
														)?.name ?? member.userId)}
											</p>
											{(() => {
												const profile = profiles.data?.find(
													(item) => item.id === member.userId,
												);
												return (
													<>
														<p className="text-xs text-muted-foreground">
															{profile?.email ?? member.status}
														</p>
														{profile?.phone ? (
															<p className="text-xs text-muted-foreground">
																{profile.phone}
															</p>
														) : null}
													</>
												);
											})()}
										</div>
									</div>
									{member.role !== "OWNER" ? (
										<div className="flex gap-2">
											<select
												aria-label={`Rol de ${member.userId}`}
												value={member.role}
												onChange={(event) => {
													void updateRole
														.mutateAsync({
															memberId: member.id,
															role: event.target.value as
																| "MANAGER"
																| "OPERATOR",
														})
														.then(() =>
															setMessage(
																"Rol del miembro actualizado correctamente.",
															),
														);
												}}
												className="h-8 rounded-md border bg-background px-2 text-xs"
											>
												<option value="OPERATOR">Operador</option>
												<option value="MANAGER">Administrador</option>
											</select>
											<Button
												size="sm"
												variant="outline"
												onClick={() => {
													void remove
														.mutateAsync(member.id)
														.then(() =>
															setMessage("Miembro retirado correctamente."),
														);
												}}
											>
												Retirar
											</Button>
										</div>
									) : null}
								</div>
							))}
						</div>
					</section>
				) : null}
				{invitations.data?.length ? (
					<section>
						<h3 className="mb-2 text-sm font-medium">Invitaciones</h3>
						<div className="divide-y rounded-lg border">
							{invitations.data.map((invitation) => (
								<div
									key={invitation.id}
									className="flex items-center justify-between gap-3 p-3 text-sm"
								>
									<div>
										<p className="font-medium">{invitation.identifier}</p>
										<p className="text-xs text-muted-foreground">
											{invitation.role === "MANAGER"
												? "Administrador"
												: "Operador"}{" "}
											·{" "}
											{invitationStatusLabel[invitation.status] ??
												invitation.status}
										</p>
									</div>
									{invitation.status === "PENDING" ? (
										<Button
											size="sm"
											variant="ghost"
											onClick={() => void revoke.mutateAsync(invitation.id)}
										>
											Revocar
										</Button>
									) : null}
								</div>
							))}
						</div>
					</section>
				) : null}
			</CardContent>
		</Card>
	);
}
