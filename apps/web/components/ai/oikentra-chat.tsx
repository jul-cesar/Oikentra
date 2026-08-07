"use client";

import { useMemo, useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	AiChat02Icon,
	ArrowReloadHorizontalIcon,
	BubbleChatSparkIcon,
	Cancel01Icon,
	SentIcon,
} from "@hugeicons/core-free-icons";
import { useEveAgent, type EveMessagePart } from "eve/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { OikentraLogo } from "@/app/brand/oikentra-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Message,
	MessageContent,
	MessageFooter,
	MessageHeader,
} from "@/components/ui/message";
import {
	MessageScroller,
	MessageScrollerButton,
	MessageScrollerContent,
	MessageScrollerItem,
	MessageScrollerProvider,
	MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { cn } from "@/lib/utils";

type Props = {
	business: {
		id: string;
		name: string;
		currencyCode?: string | null;
		timezone?: string | null;
	};
};

function renderTextParts(parts: readonly EveMessagePart[]) {
	return parts
		.filter((part) => part.type === "text")
		.map((part) => part.text)
		.join("\n")
		.trim();
}

function pendingInputRequest(parts: readonly EveMessagePart[]) {
	for (const part of parts) {
		if (part.type !== "dynamic-tool") continue;
		if (
			part.state === "approval-responded" ||
			part.state === "output-available" ||
			part.state === "output-denied"
		) {
			continue;
		}

		const request = part.toolMetadata?.eve?.inputRequest;
		if (request) return request;
	}

	return undefined;
}

function ToolStatus({ part }: { part: EveMessagePart }) {
	if (part.type !== "dynamic-tool") return null;

	const label = part.toolMetadata?.eve?.name ?? part.toolName;
	const status =
		part.state === "output-available"
			? "listo"
			: part.state === "output-error"
				? "error"
				: part.state === "approval-requested"
					? "esperando aprobación"
					: "consultando";

	return (
		<div className="flex w-fit items-center gap-1.5 rounded-full border bg-background/80 px-2.5 py-1 text-xs text-muted-foreground shadow-sm">
			<HugeiconsIcon
				icon={BubbleChatSparkIcon}
				size={13}
				strokeWidth={2}
				aria-hidden="true"
			/>
			<span>
				{label}: {status}
			</span>
		</div>
	);
}

function MarkdownMessage({ text, isUser }: { text: string; isUser: boolean }) {
	return (
		<ReactMarkdown
			remarkPlugins={[remarkGfm]}
			components={{
				p: ({ children }) => (
					<p className="my-1 first:mt-0 last:mb-0">{children}</p>
				),
				ul: ({ children }) => (
					<ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>
				),
				ol: ({ children }) => (
					<ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>
				),
				li: ({ children }) => <li className="pl-1">{children}</li>,
				strong: ({ children }) => (
					<strong className="font-semibold">{children}</strong>
				),
				code: ({ children, className }) =>
					className ? (
						<code
							className={cn(
								"block overflow-x-auto rounded-lg bg-background/80 p-3 text-xs",
								isUser && "bg-primary-foreground/10",
							)}
						>
							{children}
						</code>
					) : (
						<code
							className={cn(
								"rounded bg-background/80 px-1 py-0.5 text-[0.85em]",
								isUser && "bg-primary-foreground/15",
							)}
						>
							{children}
						</code>
					),
				pre: ({ children }) => (
					<pre className="my-2 overflow-x-auto">{children}</pre>
				),
			}}
		>
			{text}
		</ReactMarkdown>
	);
}

function MessageBubble({
	role,
	text,
}: {
	role: "assistant" | "user";
	text: string;
}) {
	if (!text) return null;
	const isUser = role === "user";

	return (
		<div
			className={cn(
				"max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
				isUser
					? "rounded-br-md bg-primary text-primary-foreground"
					: "rounded-bl-md border bg-card text-card-foreground",
			)}
		>
			<MarkdownMessage text={text} isUser={isUser} />
		</div>
	);
}

export function OikentraChat({ business }: Props) {
	const pathname = usePathname();
	const [open, setOpen] = useState(false);
	const [message, setMessage] = useState("");

	const agent = useEveAgent({
		headers: () => ({
			"X-Oikentra-Business-Id": business.id,
		}),
	});

	const isBusy = agent.status === "submitted" || agent.status === "streaming";
	const lastRequest = useMemo(() => {
		const parts = agent.data.messages.at(-1)?.parts;
		return parts ? pendingInputRequest(parts) : undefined;
	}, [agent.data.messages]);

	async function sendCurrentMessage(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const trimmed = message.trim();
		if (!trimmed || isBusy) return;

		setMessage("");
		await agent.send(trimmed, {
			clientContext: {
				route: pathname,
				businessId: business.id,
				businessName: business.name,
				currency: business.currencyCode ?? "COP",
				timezone: business.timezone ?? "America/Bogota",
			},
		});
	}

	return (
		<div className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-3">
			{open ? (
				<Card className="h-[min(700px,calc(100vh-6rem))] w-[min(440px,calc(100vw-2rem))] border-primary/10 bg-background/95 shadow-2xl shadow-primary/10 backdrop-blur-xl">
					<CardHeader className="border-b bg-gradient-to-r from-primary/10 via-background to-background">
						<div className="flex items-center justify-between gap-3">
							<div className="flex min-w-0 items-center gap-3">
								<span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary shadow-sm shadow-primary/20">
									<OikentraLogo
										showWordmark={false}
										size="sm"
										className="text-primary"
									/>
								</span>
								<div className="min-w-0">
									<CardTitle className="flex items-center gap-1.5">
										Asistente Oikentra
										<HugeiconsIcon
											icon={AiChat02Icon}
											size={16}
											strokeWidth={1.8}
											aria-hidden="true"
										/>
									</CardTitle>
									<p className="truncate text-xs text-muted-foreground">
										{business.name}
									</p>
								</div>
							</div>
							<div className="flex gap-1">
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									aria-label="Nueva conversación"
									onClick={agent.reset}
								>
									<HugeiconsIcon
										icon={ArrowReloadHorizontalIcon}
										size={16}
										strokeWidth={2}
										aria-hidden="true"
									/>
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									aria-label="Cerrar asistente"
									onClick={() => setOpen(false)}
								>
									<HugeiconsIcon
										icon={Cancel01Icon}
										size={16}
										strokeWidth={2}
										aria-hidden="true"
									/>
								</Button>
							</div>
						</div>
					</CardHeader>
					<CardContent className="flex min-h-0 flex-1 flex-col p-0">
						<MessageScrollerProvider
							autoScroll
							defaultScrollPosition="last-anchor"
							scrollPreviousItemPeek={56}
						>
							<MessageScroller className="flex-1">
								<MessageScrollerViewport>
									<MessageScrollerContent
										aria-busy={isBusy}
										className="gap-4 px-4 py-3"
									>
										{agent.data.messages.length === 0 ? (
											<MessageScrollerItem messageId="empty-state">
												<div className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground shadow-sm">
													<div className="mb-4 flex gap-3">
														<span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
															<HugeiconsIcon
																icon={BubbleChatSparkIcon}
																size={18}
																strokeWidth={2}
																aria-hidden="true"
															/>
														</span>
														<div>
															<p className="font-medium text-foreground">
																Hola, soy Eve.
															</p>
															<p className="mt-1 leading-relaxed">
																Puedo ayudarte a consultar ventas, gastos, abonos,
																fiados, clientes que deben y movimientos recientes de
																tu negocio. Por ahora solo consulto datos; no registro
																cambios todavía.
															</p>
														</div>
													</div>
													<p className="mb-2 font-medium text-foreground">
														Prueba con una pregunta:
													</p>
													<div className="flex flex-wrap gap-2">
														{[
															"¿Cómo van las ventas de hoy?",
															"¿Quiénes me deben?",
															"Muéstrame los últimos movimientos",
															"¿Cuánto me deben en total?",
														].map((example) => (
															<Button
																key={example}
																type="button"
																variant="secondary"
																size="sm"
																onClick={() => setMessage(example)}
															>
																{example}
															</Button>
														))}
													</div>
												</div>
											</MessageScrollerItem>
										) : null}
										{agent.data.messages.map((item) => {
											const text = renderTextParts(item.parts);
											const request = pendingInputRequest(item.parts);
											const isUser = item.role === "user";

											return (
												<MessageScrollerItem
													key={item.id}
													messageId={item.id}
													scrollAnchor={isUser}
												>
													<Message align={isUser ? "end" : "start"}>
														<MessageContent>
															<MessageHeader>
																{isUser ? "Tú" : "Oikentra"}
															</MessageHeader>
															<MessageBubble role={item.role} text={text} />
															{item.parts.map((part, index) => (
																<ToolStatus
																	key={`${item.id}-${index}`}
																	part={part}
																/>
															))}
															{request ? (
																<div className="max-w-[88%] rounded-xl border bg-card p-3 text-sm shadow-sm">
																	<p className="mb-2 font-medium">
																		{request.prompt}
																	</p>
																	<div className="flex flex-wrap gap-2">
																		{request.options?.map((option) => (
																			<Button
																				key={option.id}
																				type="button"
																				size="sm"
																				variant={
																					option.style === "danger"
																						? "destructive"
																						: "default"
																				}
																				disabled={isBusy}
																				onClick={() =>
																					void agent.respond([
																						{
																							requestId: request.requestId,
																							optionId: option.id,
																						},
																					])
																				}
																			>
																				{option.label}
																			</Button>
																		))}
																	</div>
																</div>
															) : null}
															<MessageFooter>
																{item.metadata?.status === "streaming"
																	? "Escribiendo…"
																	: ""}
															</MessageFooter>
														</MessageContent>
													</Message>
												</MessageScrollerItem>
											);
										})}
										{isBusy ? (
											<MessageScrollerItem messageId="typing">
												<p className="flex items-center gap-1.5 text-xs text-muted-foreground">
													<HugeiconsIcon
														icon={BubbleChatSparkIcon}
														size={14}
														strokeWidth={2}
														aria-hidden="true"
													/>
													Pensando…
												</p>
											</MessageScrollerItem>
										) : null}
										{agent.error ? (
											<MessageScrollerItem messageId="error">
												<p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
													{agent.error.message}
												</p>
											</MessageScrollerItem>
										) : null}
									</MessageScrollerContent>
								</MessageScrollerViewport>
								<MessageScrollerButton />
							</MessageScroller>
						</MessageScrollerProvider>
						<form
							className="flex gap-2 border-t bg-background/80 p-3"
							onSubmit={sendCurrentMessage}
						>
							<Input
								value={message}
								onChange={(event) => setMessage(event.target.value)}
								placeholder="Pregúntale a Oikentra…"
								disabled={isBusy || Boolean(lastRequest)}
								className="h-10 rounded-full px-4"
							/>
							<Button
								type="submit"
								size="icon-lg"
								className="rounded-full"
								aria-label="Enviar mensaje"
								disabled={isBusy || Boolean(lastRequest) || !message.trim()}
							>
								<HugeiconsIcon
									icon={SentIcon}
									size={18}
									strokeWidth={2}
									aria-hidden="true"
								/>
							</Button>
						</form>
					</CardContent>
				</Card>
			) : (
				<Button
					type="button"
					size="icon-lg"
					aria-label="Abrir asistente Oikentra"
					className="size-14 rounded-2xl shadow-2xl shadow-primary/20"
					onClick={() => setOpen(true)}
				>
					<OikentraLogo
						showWordmark={false}
						size="sm"
						className="text-primary-foreground"
					/>
				</Button>
			)}
		</div>
	);
}
