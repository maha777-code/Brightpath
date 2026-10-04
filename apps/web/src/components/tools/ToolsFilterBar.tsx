import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Search, X } from 'lucide-react';
import { TEACHER_TOOL_FOCUS_LABELS, type TeacherToolFocusArea } from '@brightpath/shared';

export type ToolsLibraryFilter = 'all' | 'favorites' | 'custom';
export type ToolsSortKey = 'popular' | 'newest' | 'alpha';

const DEFAULT_SORT: ToolsSortKey = 'popular';

export function toolsFiltersActive(
  query: string,
  focusArea: TeacherToolFocusArea | 'all',
  library: ToolsLibraryFilter,
  sort: ToolsSortKey,
): boolean {
  return query.trim() !== '' || focusArea !== 'all' || library !== 'all' || sort !== DEFAULT_SORT;
}

export function ToolsFilterBar({
  query,
  onQueryChange,
  focusArea,
  onFocusAreaChange,
  library,
  onLibraryChange,
  sort,
  onSortChange,
  onClear,
  searchPlaceholder = 'Search all tools...',
  showCustom = true,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  focusArea: TeacherToolFocusArea | 'all';
  onFocusAreaChange: (value: TeacherToolFocusArea | 'all') => void;
  library: ToolsLibraryFilter;
  onLibraryChange: (value: ToolsLibraryFilter) => void;
  sort: ToolsSortKey;
  onSortChange: (value: ToolsSortKey) => void;
  onClear: () => void;
  searchPlaceholder?: string;
  showCustom?: boolean;
}) {
  const [notice, setNotice] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const active = toolsFiltersActive(query, focusArea, library, sort);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const clearAll = () => {
    onClear();
    setNotice('Filters cleared');
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setNotice(null), 2800);
  };

  const selectClass =
    'td-input min-w-[12rem] flex-1 cursor-pointer rounded-xl bg-slate-950/60 px-3 py-2 text-sm font-semibold text-slate-300';

  return (
    <div className="mb-6 w-full space-y-3 rounded-2xl border border-slate-800/90 bg-slate-900/90 p-4 shadow-xl backdrop-blur-xl">
      <label className="relative block w-full">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="td-input w-full rounded-xl bg-slate-950/60 py-2.5 pl-10 pr-10 text-sm text-slate-200 outline-none"
        />
        {query ? (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer appearance-none border-0 bg-transparent p-1 text-slate-500 hover:text-slate-300"
            title="Clear search text"
            aria-label="Clear search text"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </label>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          <select
            value={focusArea}
            onChange={(event) => onFocusAreaChange(event.target.value as TeacherToolFocusArea | 'all')}
            className={selectClass}
            aria-label="Discover tools by focus area"
          >
            <option value="all">Discover tools by focus area</option>
            {(Object.keys(TEACHER_TOOL_FOCUS_LABELS) as TeacherToolFocusArea[]).map((area) => (
              <option key={area} value={area}>
                {TEACHER_TOOL_FOCUS_LABELS[area]}
              </option>
            ))}
          </select>

          <select
            value={library}
            onChange={(event) => onLibraryChange(event.target.value as ToolsLibraryFilter)}
            className={selectClass}
            aria-label="Favorites"
          >
            <option value="all">All tools</option>
            <option value="favorites">Starred / Favorites only</option>
            {showCustom ? <option value="custom">Custom</option> : null}
          </select>

          <select
            value={sort}
            onChange={(event) => onSortChange(event.target.value as ToolsSortKey)}
            className={selectClass}
            aria-label="Sort by"
          >
            <option value="popular">Most popular</option>
            <option value="alpha">Alphabetical</option>
            <option value="newest">Newest</option>
          </select>
        </div>

        {active ? (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex cursor-pointer appearance-none items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-bold text-rose-400 shadow-sm transition-all hover:border-rose-500/60 hover:bg-rose-500/20"
            title="Reset all search queries and active filters"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Clear Filters</span>
          </button>
        ) : null}
      </div>

      {notice ? (
        <p role="status" className="text-xs font-semibold text-cyan-300">
          {notice}
        </p>
      ) : null}
    </div>
  );
}
