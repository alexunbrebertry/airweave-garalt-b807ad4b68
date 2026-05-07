import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getAppIconUrl } from "@/lib/utils/icons";
import { useTheme } from "@/lib/theme-provider";

// ===== Types mirroring backend SearchResult =====
// Kept loose on purpose: Vespa returns optional/varying fields per source.

interface Breadcrumb {
    entity_id?: string;
    name?: string;
    entity_type?: string;
}

interface SystemMetadata {
    source_name?: string;
    entity_type?: string;
    original_entity_id?: string;
    chunk_index?: number;
    sync_id?: string;
    sync_job_id?: string;
}

interface BrowseRow {
    entity_id: string;
    name?: string | null;
    textual_representation?: string | null;
    breadcrumbs?: Breadcrumb[] | null;
    created_at?: string | null;
    updated_at?: string | null;
    airweave_system_metadata?: SystemMetadata;
    web_url?: string | null;
    url?: string | null;
    raw_source_fields?: Record<string, unknown> | null;
}

interface BrowseResponse {
    results: BrowseRow[];
    total: number;
    limit: number;
    offset: number;
}

interface BrowseTableProps {
    collectionReadableId: string;
    sourceConnections: Array<{
        id: string;
        name: string;
        short_name: string;
        sync_id?: string;
    }>;
}

const PAGE_SIZE = 50;

const ALL_SOURCES_VALUE = "__all__";

const formatTimestamp = (value: string | null | undefined): string => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
};

export function BrowseTable({ collectionReadableId, sourceConnections }: BrowseTableProps) {
    const { resolvedTheme } = useTheme();
    const [rows, setRows] = useState<BrowseRow[]>([]);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedSyncId, setSelectedSyncId] = useState<string>(ALL_SOURCES_VALUE);
    const [activeRow, setActiveRow] = useState<BrowseRow | null>(null);

    // sync_id → SourceConnection lookup
    const syncToConnection = useMemo(() => {
        const map = new Map<string, BrowseTableProps["sourceConnections"][number]>();
        for (const conn of sourceConnections) {
            if (conn.sync_id) map.set(conn.sync_id, conn);
        }
        return map;
    }, [sourceConnections]);

    // Reset pagination when filter changes
    useEffect(() => {
        setOffset(0);
    }, [selectedSyncId]);

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const body: Record<string, unknown> = {
                    limit: PAGE_SIZE,
                    offset,
                };
                if (selectedSyncId !== ALL_SOURCES_VALUE) {
                    body.sync_ids = [selectedSyncId];
                }

                const response = await apiClient.post(
                    `/collections/${collectionReadableId}/browse`,
                    body
                );
                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(text || `Browse failed (${response.status})`);
                }
                const data: BrowseResponse = await response.json();
                if (!cancelled) {
                    setRows(data.results);
                    setTotal(data.total);
                }
            } catch (e) {
                if (!cancelled) {
                    setError(e instanceof Error ? e.message : "Failed to load");
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };
        run();
        return () => {
            cancelled = true;
        };
    }, [collectionReadableId, offset, selectedSyncId]);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
    const canPrev = offset > 0;
    const canNext = offset + PAGE_SIZE < total;

    return (
        <div className="w-full">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                    <Select value={selectedSyncId} onValueChange={setSelectedSyncId}>
                        <SelectTrigger className="h-8 w-[220px]">
                            <SelectValue placeholder="All sources" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL_SOURCES_VALUE}>All sources</SelectItem>
                            {sourceConnections
                                .filter((c) => !!c.sync_id)
                                .map((c) => (
                                    <SelectItem key={c.id} value={c.sync_id as string}>
                                        {c.name}
                                    </SelectItem>
                                ))}
                        </SelectContent>
                    </Select>
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
                <div className="text-xs text-muted-foreground">
                    {total > 0 ? (
                        <>
                            {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
                        </>
                    ) : isLoading ? (
                        <span>Loading…</span>
                    ) : (
                        <span>0 results</span>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[40%]">Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Source</TableHead>
                            <TableHead>Updated</TableHead>
                            <TableHead className="text-right">Open</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && rows.length === 0 ? (
                            Array.from({ length: 8 }).map((_, i) => (
                                <TableRow key={`skeleton-${i}`}>
                                    {Array.from({ length: 5 }).map((__, j) => (
                                        <TableCell key={j}>
                                            <Skeleton className="h-4 w-full" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                    {error ? `Error: ${error}` : "No entities to browse yet."}
                                </TableCell>
                            </TableRow>
                        ) : (
                            rows.map((row) => {
                                const meta = row.airweave_system_metadata ?? {};
                                const conn = meta.sync_id ? syncToConnection.get(meta.sync_id) : undefined;
                                const sourceLabel = conn?.name ?? meta.source_name ?? "—";
                                const shortName = conn?.short_name ?? meta.source_name;
                                return (
                                    <TableRow
                                        key={row.entity_id}
                                        className="cursor-pointer"
                                        onClick={() => setActiveRow(row)}
                                    >
                                        <TableCell className="font-medium">
                                            <div className="truncate max-w-[480px]" title={row.name ?? row.entity_id}>
                                                {row.name || row.entity_id}
                                            </div>
                                            {row.textual_representation && (
                                                <div className="text-xs text-muted-foreground truncate max-w-[480px]">
                                                    {row.textual_representation}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="font-mono text-[10px]">
                                                {meta.entity_type || "—"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {shortName && (
                                                    <img
                                                        src={getAppIconUrl(shortName, resolvedTheme)}
                                                        alt={sourceLabel}
                                                        className="h-4 w-4 object-contain"
                                                    />
                                                )}
                                                <span className="text-sm">{sourceLabel}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {formatTimestamp(row.updated_at ?? row.created_at)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {row.web_url ? (
                                                <a
                                                    href={row.web_url}
                                                    target="_blank"
                                                    rel="noreferrer noopener"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className={cn(
                                                        "inline-flex h-7 w-7 items-center justify-center rounded",
                                                        "text-muted-foreground hover:text-foreground hover:bg-muted"
                                                    )}
                                                    title="Open in source"
                                                >
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                </a>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-3">
                <div className="text-xs text-muted-foreground">
                    Page {currentPage} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={!canPrev || isLoading}
                        onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Prev
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={!canNext || isLoading}
                        onClick={() => setOffset((o) => o + PAGE_SIZE)}
                    >
                        Next
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Row drawer */}
            <Sheet open={!!activeRow} onOpenChange={(open) => !open && setActiveRow(null)}>
                <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
                    {activeRow && (
                        <>
                            <SheetHeader>
                                <SheetTitle className="break-words">
                                    {activeRow.name || activeRow.entity_id}
                                </SheetTitle>
                                <SheetDescription className="font-mono text-[11px] break-all">
                                    {activeRow.entity_id}
                                </SheetDescription>
                            </SheetHeader>
                            <div className="mt-4 space-y-4 text-sm">
                                <DetailRow
                                    label="Type"
                                    value={activeRow.airweave_system_metadata?.entity_type}
                                />
                                <DetailRow
                                    label="Source"
                                    value={activeRow.airweave_system_metadata?.source_name}
                                />
                                <DetailRow label="Created" value={formatTimestamp(activeRow.created_at)} />
                                <DetailRow label="Updated" value={formatTimestamp(activeRow.updated_at)} />
                                {activeRow.breadcrumbs && activeRow.breadcrumbs.length > 0 && (
                                    <div>
                                        <div className="text-xs font-medium text-muted-foreground mb-1">Breadcrumbs</div>
                                        <div className="text-xs">
                                            {activeRow.breadcrumbs.map((b, i) => (
                                                <span key={i}>
                                                    {i > 0 && " / "}
                                                    {b.name || b.entity_id}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {activeRow.textual_representation && (
                                    <div>
                                        <div className="text-xs font-medium text-muted-foreground mb-1">
                                            Content
                                        </div>
                                        <pre className="whitespace-pre-wrap break-words text-xs bg-muted rounded p-3 max-h-[40vh] overflow-auto">
                                            {activeRow.textual_representation}
                                        </pre>
                                    </div>
                                )}
                                {activeRow.raw_source_fields &&
                                    Object.keys(activeRow.raw_source_fields).length > 0 && (
                                        <div>
                                            <div className="text-xs font-medium text-muted-foreground mb-1">
                                                Raw fields
                                            </div>
                                            <pre className="whitespace-pre-wrap break-words text-xs bg-muted rounded p-3 max-h-[30vh] overflow-auto">
                                                {JSON.stringify(activeRow.raw_source_fields, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
    if (!value) return null;
    return (
        <div className="flex items-baseline gap-3">
            <div className="text-xs font-medium text-muted-foreground w-24 shrink-0">{label}</div>
            <div className="text-sm break-all">{value}</div>
        </div>
    );
}
