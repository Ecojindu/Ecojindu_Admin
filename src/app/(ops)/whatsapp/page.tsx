"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  CheckCheck,
  Clock,
  CreditCard,
  ExternalLink,
  MessageSquare,
  Phone,
  QrCode,
  RefreshCw,
  Search,
  Send,
  Ticket,
  User,
  Zap,
} from "lucide-react";

import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, Panel, PanelBody } from "@/components/ui/panel";
import { cn, formatDateTime } from "@/lib/utils";

interface ChatSummary {
  user_id: string;
  channel: "whatsapp" | "web" | string;
  phone: string;
  created_at: string;
  last_updated: string;
  last_message: string;
  last_role: "user" | "model" | string;
  message_count: number;
}

interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
  metadata?: {
    booking_ref?: string;
    qr_image_url?: string;
    type?: string;
  };
}

interface ChatDetail {
  user_id: string;
  channel: string;
  phone: string;
  created_at: string;
  last_updated: string;
  last_message: string;
  message_count: number;
  messages: ChatMessage[];
}

export default function WhatsAppChatsPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [channel, setChannel] = React.useState<"all" | "whatsapp" | "web">("all");
  const [autoRefresh, setAutoRefresh] = React.useState(true);

  // Auto-scroll ref for chat window
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // 1. Fetch conversations list
  const {
    data: chatsData,
    isLoading: isListLoading,
    isFetching: isListFetching,
    refetch: refetchList,
  } = useQuery<{ chats: ChatSummary[]; count: number }>({
    queryKey: ["admin-chats", channel],
    queryFn: async () => {
      const q = channel !== "all" ? `?channel=${channel}` : "";
      const res = await fetch(`/api/chats${q}`);
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return res.json();
    },
    refetchInterval: autoRefresh ? 10_000 : false,
  });

  // Filter conversations by search term
  const filteredChats = React.useMemo(() => {
    const list = chatsData?.chats ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.phone?.toLowerCase().includes(q) ||
        c.user_id?.toLowerCase().includes(q) ||
        c.last_message?.toLowerCase().includes(q)
    );
  }, [chatsData?.chats, search]);

  // Default select first conversation if none selected
  React.useEffect(() => {
    if (!selectedId && filteredChats.length > 0) {
      setSelectedId(filteredChats[0].user_id);
    }
  }, [filteredChats, selectedId]);

  // 2. Fetch active chat thread
  const {
    data: chatDetailData,
    isLoading: isDetailLoading,
    refetch: refetchDetail,
  } = useQuery<{ chat: ChatDetail }>({
    queryKey: ["admin-chat-detail", selectedId],
    queryFn: async () => {
      if (!selectedId) throw new Error("No conversation selected");
      const res = await fetch(`/api/chats/${encodeURIComponent(selectedId)}`);
      if (!res.ok) throw new Error("Failed to load chat thread");
      return res.json();
    },
    enabled: Boolean(selectedId),
    refetchInterval: autoRefresh ? 6_000 : false,
  });

  const activeChat = chatDetailData?.chat;

  // Scroll to bottom when messages update
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages?.length]);

  const activePhone = activeChat?.phone || (selectedId?.replace("whatsapp:", "") ?? "");
  const isWhatsApp = activeChat?.channel === "whatsapp" || selectedId?.startsWith("whatsapp:");

  return (
    <div className="space-y-6">
      <PageHeader
        title="WhatsApp & Client Chats"
        description="Monitor real-time conversations between clients, the booking concierge, Paystack payments, and automated QR tickets."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchList();
                if (selectedId) refetchDetail();
              }}
              className="gap-1.5"
            >
              <RefreshCw className={cn("size-3.5", isListFetching && "animate-spin")} />
              Refresh
            </Button>
            <Button
              variant={autoRefresh ? "secondary" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh((prev) => !prev)}
              className="text-xs"
            >
              <span className={cn("mr-1.5 size-2 rounded-full", autoRefresh ? "bg-emerald-500 animate-pulse" : "bg-neutral-300")} />
              {autoRefresh ? "Live 10s" : "Live Paused"}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left column: Conversations sidebar */}
        <div className="space-y-3 lg:col-span-4">
          {/* Channel Filter Pills */}
          <div className="flex items-center gap-1 rounded-xl bg-neutral-100 p-1">
            {(
              [
                { id: "all", label: "All Chats" },
                { id: "whatsapp", label: "WhatsApp" },
                { id: "web", label: "Web Widget" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setChannel(t.id)}
                className={cn(
                  "flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all",
                  channel === t.id
                    ? "bg-white text-forest shadow-sm"
                    : "text-neutral-500 hover:text-neutral-900"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
            <Input
              type="search"
              placeholder="Filter by phone or message..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 pl-9 text-xs"
            />
          </div>

          {/* Conversations List */}
          <Panel className="max-h-[calc(100vh-280px)] overflow-y-auto">
            {isListLoading ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse space-y-2 rounded-xl bg-neutral-100 p-3">
                    <div className="h-4 w-1/2 rounded bg-neutral-200" />
                    <div className="h-3 w-3/4 rounded bg-neutral-200" />
                  </div>
                ))}
              </div>
            ) : filteredChats.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="No chats found"
                description={search ? "Try searching with a different term." : "No customer chats have been recorded yet."}
              />
            ) : (
              <div className="divide-y divide-neutral-100">
                {filteredChats.map((c) => {
                  const isSelected = c.user_id === selectedId;
                  const isWa = c.channel === "whatsapp" || c.user_id.startsWith("whatsapp:");

                  return (
                    <button
                      key={c.user_id}
                      onClick={() => setSelectedId(c.user_id)}
                      className={cn(
                        "w-full text-left p-3.5 transition-colors flex items-start gap-3",
                        isSelected
                          ? "bg-cream-100/80 border-l-4 border-l-leaf"
                          : "hover:bg-neutral-50 border-l-4 border-l-transparent"
                      )}
                    >
                      <div
                        className={cn(
                          "grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold",
                          isWa
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-blue-100 text-blue-800"
                        )}
                      >
                        {isWa ? <MessageSquare className="size-4 text-emerald-700" /> : <Bot className="size-4 text-blue-700" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="truncate text-xs font-bold text-neutral-900">
                            {c.phone || c.user_id.replace("web-", "Web Client ")}
                          </p>
                          <span className="shrink-0 text-[10px] text-neutral-400">
                            {c.last_updated ? formatDateTime(c.last_updated) : ""}
                          </span>
                        </div>

                        <p className="mt-1 line-clamp-2 text-xs text-neutral-500">
                          {c.last_message || "Active chat session"}
                        </p>

                        <div className="mt-2 flex items-center gap-1.5">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                              isWa
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-blue-50 text-blue-700"
                            )}
                          >
                            {isWa ? "WhatsApp" : "Web"}
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            {c.message_count} msg{c.message_count === 1 ? "" : "s"}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>

        {/* Right column: Active Chat Thread */}
        <div className="lg:col-span-8">
          <Panel className="flex h-[calc(100vh-240px)] flex-col">
            {/* Chat Thread Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 bg-neutral-50/50 px-5 py-3.5">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "grid size-10 place-items-center rounded-full text-sm font-bold",
                    isWhatsApp
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-blue-100 text-blue-800"
                  )}
                >
                  {isWhatsApp ? <Phone className="size-4" /> : <Bot className="size-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-neutral-900">
                      {activePhone || selectedId || "Select a conversation"}
                    </h3>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                        isWhatsApp
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-blue-100 text-blue-800"
                      )}
                    >
                      {isWhatsApp ? "WhatsApp Client" : "Web Chat"}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    {activeChat ? `${activeChat.messages?.length || 0} messages in this thread` : "No chat selected"}
                  </p>
                </div>
              </div>

              {selectedId && (
                <div className="flex items-center gap-2">
                  {isWhatsApp && activePhone && (
                    <a
                      href={`https://wa.me/${activePhone.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700 shadow-sm transition hover:bg-neutral-50"
                    >
                      <ExternalLink className="size-3.5 text-emerald-600" />
                      Open WhatsApp
                    </a>
                  )}
                  {activePhone && (
                    <Link
                      href={`/bookings?q=${encodeURIComponent(activePhone)}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700 shadow-sm transition hover:bg-neutral-50"
                    >
                      <Ticket className="size-3.5 text-leaf" />
                      View Bookings
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Chat Thread Messages */}
            <PanelBody className="flex-1 overflow-y-auto bg-neutral-50/30 p-4 sm:p-6">
              {!selectedId ? (
                <EmptyState
                  icon={MessageSquare}
                  title="No conversation selected"
                  description="Choose a conversation from the left to view the complete chat history."
                />
              ) : isDetailLoading && !activeChat ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse flex items-start gap-3">
                      <div className="size-8 rounded-full bg-neutral-200" />
                      <div className="h-16 w-2/3 rounded-2xl bg-neutral-200" />
                    </div>
                  ))}
                </div>
              ) : activeChat?.messages?.length === 0 ? (
                <EmptyState
                  icon={MessageSquare}
                  title="Empty conversation"
                  description="No messages recorded in this conversation yet."
                />
              ) : (
                <div className="space-y-4">
                  {activeChat?.messages?.map((msg) => {
                    const isBot = msg.role === "model";
                    const hasPaystackLink = msg.text.includes("checkout.paystack.com") || msg.text.includes("paystack.com");
                    const hasQrTicket = msg.metadata?.qr_image_url || msg.text.includes("qr.png");
                    const bookingRef = msg.metadata?.booking_ref;

                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex items-start gap-2.5",
                          isBot ? "justify-start" : "justify-end"
                        )}
                      >
                        {isBot && (
                          <div className="grid size-8 shrink-0 place-items-center rounded-full bg-forest-deep text-white shadow-sm">
                            <Zap className="size-4 text-leaf" />
                          </div>
                        )}

                        <div
                          className={cn(
                            "max-w-[85%] rounded-2xl p-4 shadow-sm sm:max-w-[75%]",
                            isBot
                              ? "bg-white border border-neutral-200/80 text-neutral-900 rounded-tl-sm"
                              : "bg-leaf-dark text-white rounded-tr-sm"
                          )}
                        >
                          {/* Role Header */}
                          <div className="mb-1 flex items-center justify-between gap-3 text-[11px]">
                            <span className={cn("font-bold", isBot ? "text-forest" : "text-cream-100")}>
                              {isBot ? "Eko (Ecojindu Concierge)" : "Client"}
                            </span>
                            <span className={cn("text-[10px]", isBot ? "text-neutral-400" : "text-white/70")}>
                              {msg.timestamp ? formatDateTime(msg.timestamp) : ""}
                            </span>
                          </div>

                          {/* Message Body */}
                          <div className={cn("whitespace-pre-wrap text-xs leading-relaxed", isBot ? "text-neutral-800" : "text-white")}>
                            {msg.text}
                          </div>

                          {/* Highlighted Paystack Payment Link Box */}
                          {hasPaystackLink && (
                            <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-amber-900">
                              <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900">
                                <CreditCard className="size-3.5 text-amber-600" />
                                Paystack Checkout Link Active
                              </div>
                              <p className="mt-0.5 text-[11px] text-amber-800">
                                Client was sent direct Paystack checkout with 10-minute seat hold.
                              </p>
                            </div>
                          )}

                          {/* QR Code Ticket Attachment Box */}
                          {hasQrTicket && (
                            <div className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-emerald-950">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-900">
                                  <QrCode className="size-4 text-emerald-700" />
                                  Boarding Pass Ticket Dispatched
                                </div>
                                {bookingRef && (
                                  <Link
                                    href={`/bookings?q=${encodeURIComponent(bookingRef)}`}
                                    className="text-[11px] font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
                                  >
                                    Ref: {bookingRef}
                                    <ExternalLink className="size-3" />
                                  </Link>
                                )}
                              </div>
                              {msg.metadata?.qr_image_url && (
                                <div className="mt-2.5 flex items-center gap-3">
                                  <img
                                    src={msg.metadata.qr_image_url}
                                    alt="QR Boarding Pass"
                                    className="size-20 rounded-lg border border-emerald-200 bg-white p-1 shadow-sm"
                                  />
                                  <div className="text-[11px] text-emerald-800">
                                    <p className="font-semibold">Official HMAC Verified Pass</p>
                                    <p className="text-[10px] text-emerald-700/80">Delivered directly to customer on WhatsApp & Email.</p>
                                    <a
                                      href={msg.metadata.qr_image_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="mt-1 inline-block text-[11px] font-bold text-emerald-800 underline"
                                    >
                                      View full ticket
                                    </a>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {!isBot && (
                          <div className="grid size-8 shrink-0 place-items-center rounded-full bg-neutral-200 text-neutral-700 shadow-sm">
                            <User className="size-4" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </PanelBody>

            {/* Footer Status Banner */}
            <div className="border-t border-neutral-100 bg-neutral-50 px-5 py-2.5 text-xs text-neutral-500 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px]">
                <CheckCheck className="size-3.5 text-emerald-600" />
                Live WhatsApp Webhook & Auto-dispatch connected
              </span>
              <span className="text-[11px] text-neutral-400">
                Twilio WhatsApp: <code className="font-mono text-neutral-700">+234 812 800 0082</code>
              </span>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
