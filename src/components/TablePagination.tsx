import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  pageSizeOptions: number[];
  canGoNext: boolean;
  canGoPrev: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  onFirstPage: () => void;
  onLastPage: () => void;
}

export default function TablePagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  startIndex,
  endIndex,
  pageSizeOptions,
  canGoNext,
  canGoPrev,
  onPageChange,
  onPageSizeChange,
  onNextPage,
  onPrevPage,
  onFirstPage,
  onLastPage,
}: TablePaginationProps) {
  if (totalItems === 0) return null;

  return (
    <div className="flex flex-col items-center gap-4 py-4 border-t border-border">
      {/* Top row on mobile: Page info */}
      <div className="text-sm text-muted-foreground text-center">
        Showing {startIndex} to {endIndex} of {totalItems} entries
      </div>

      {/* Middle row: Navigation buttons */}
      <div className="flex items-center gap-1 flex-wrap justify-center">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={onFirstPage}
          disabled={!canGoPrev}
          title="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={onPrevPage}
          disabled={!canGoPrev}
          title="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Page numbers - hidden on very small screens */}
        <div className="hidden xs:flex items-center gap-1 mx-1 sm:mx-2">
          {generatePageNumbers(currentPage, totalPages).map((page, index) => (
            page === '...' ? (
              <span key={`ellipsis-${index}`} className="px-1 sm:px-2 text-muted-foreground">
                ...
              </span>
            ) : (
              <Button
                key={page}
                variant={currentPage === page ? 'default' : 'outline'}
                size="icon"
                className="h-8 w-8"
                onClick={() => onPageChange(page as number)}
              >
                {page}
              </Button>
            )
          ))}
        </div>

        {/* Mobile: Show current page / total */}
        <span className="xs:hidden px-2 text-sm text-muted-foreground">
          {currentPage} / {totalPages}
        </span>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={onNextPage}
          disabled={!canGoNext}
          title="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={onLastPage}
          disabled={!canGoNext}
          title="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Bottom row: Rows per page selector */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Rows per page:</span>
        <Select
          value={pageSize.toString()}
          onValueChange={(value) => onPageSizeChange(parseInt(value))}
        >
          <SelectTrigger className="h-8 w-[70px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((size) => (
              <SelectItem key={size} value={size.toString()}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function generatePageNumbers(currentPage: number, totalPages: number): (number | string)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | string)[] = [];
  
  // Always show first page
  pages.push(1);
  
  if (currentPage > 3) {
    pages.push('...');
  }
  
  // Show pages around current
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  
  for (let i = start; i <= end; i++) {
    if (!pages.includes(i)) {
      pages.push(i);
    }
  }
  
  if (currentPage < totalPages - 2) {
    pages.push('...');
  }
  
  // Always show last page
  if (!pages.includes(totalPages)) {
    pages.push(totalPages);
  }
  
  return pages;
}
