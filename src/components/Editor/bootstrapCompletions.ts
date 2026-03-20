// Bootstrap 5 class names for Monaco IntelliSense
// Automatically suggests class names when cursor is inside class="..." attribute

/* eslint-disable @typescript-eslint/no-explicit-any */

/** All Bootstrap 5 CSS utility & component class names */
export const BOOTSTRAP5_CLASSES = [
    // --- Layout ---
    'container', 'container-fluid', 'container-sm', 'container-md', 'container-lg', 'container-xl', 'container-xxl',
    'row', 'row-cols-1', 'row-cols-2', 'row-cols-3', 'row-cols-4', 'row-cols-5', 'row-cols-6',
    'row-cols-auto', 'row-cols-sm-1', 'row-cols-md-2', 'row-cols-lg-3',
    'col', 'col-auto', 'col-1', 'col-2', 'col-3', 'col-4', 'col-5', 'col-6',
    'col-7', 'col-8', 'col-9', 'col-10', 'col-11', 'col-12',
    'col-sm-1', 'col-sm-2', 'col-sm-3', 'col-sm-4', 'col-sm-6', 'col-sm-8', 'col-sm-12',
    'col-md-1', 'col-md-2', 'col-md-3', 'col-md-4', 'col-md-6', 'col-md-8', 'col-md-12',
    'col-lg-1', 'col-lg-2', 'col-lg-3', 'col-lg-4', 'col-lg-6', 'col-lg-8', 'col-lg-12',
    'col-xl-1', 'col-xl-2', 'col-xl-3', 'col-xl-4', 'col-xl-6', 'col-xl-8', 'col-xl-12',
    'offset-1', 'offset-2', 'offset-3', 'offset-4', 'offset-6',
    'g-0', 'g-1', 'g-2', 'g-3', 'g-4', 'g-5',
    'gx-0', 'gx-1', 'gx-2', 'gx-3', 'gx-4', 'gx-5',
    'gy-0', 'gy-1', 'gy-2', 'gy-3', 'gy-4', 'gy-5',

    // --- Display ---
    'd-none', 'd-inline', 'd-inline-block', 'd-block', 'd-flex', 'd-inline-flex', 'd-grid', 'd-table',
    'd-sm-none', 'd-sm-block', 'd-sm-flex',
    'd-md-none', 'd-md-block', 'd-md-flex',
    'd-lg-none', 'd-lg-block', 'd-lg-flex',
    'd-xl-none', 'd-xl-block', 'd-xl-flex',

    // --- Flexbox ---
    'flex-row', 'flex-column', 'flex-row-reverse', 'flex-column-reverse',
    'flex-wrap', 'flex-nowrap', 'flex-wrap-reverse',
    'flex-fill', 'flex-grow-0', 'flex-grow-1', 'flex-shrink-0', 'flex-shrink-1',
    'justify-content-start', 'justify-content-end', 'justify-content-center',
    'justify-content-between', 'justify-content-around', 'justify-content-evenly',
    'align-items-start', 'align-items-end', 'align-items-center', 'align-items-baseline', 'align-items-stretch',
    'align-content-start', 'align-content-end', 'align-content-center', 'align-content-between', 'align-content-around',
    'align-self-start', 'align-self-end', 'align-self-center', 'align-self-baseline', 'align-self-stretch', 'align-self-auto',
    'order-0', 'order-1', 'order-2', 'order-3', 'order-4', 'order-5', 'order-first', 'order-last',
    'gap-0', 'gap-1', 'gap-2', 'gap-3', 'gap-4', 'gap-5',

    // --- Spacing: Margin ---
    'm-0', 'm-1', 'm-2', 'm-3', 'm-4', 'm-5', 'm-auto',
    'mt-0', 'mt-1', 'mt-2', 'mt-3', 'mt-4', 'mt-5', 'mt-auto',
    'mb-0', 'mb-1', 'mb-2', 'mb-3', 'mb-4', 'mb-5', 'mb-auto',
    'ms-0', 'ms-1', 'ms-2', 'ms-3', 'ms-4', 'ms-5', 'ms-auto',
    'me-0', 'me-1', 'me-2', 'me-3', 'me-4', 'me-5', 'me-auto',
    'mx-0', 'mx-1', 'mx-2', 'mx-3', 'mx-4', 'mx-5', 'mx-auto',
    'my-0', 'my-1', 'my-2', 'my-3', 'my-4', 'my-5', 'my-auto',
    // Padding
    'p-0', 'p-1', 'p-2', 'p-3', 'p-4', 'p-5',
    'pt-0', 'pt-1', 'pt-2', 'pt-3', 'pt-4', 'pt-5',
    'pb-0', 'pb-1', 'pb-2', 'pb-3', 'pb-4', 'pb-5',
    'ps-0', 'ps-1', 'ps-2', 'ps-3', 'ps-4', 'ps-5',
    'pe-0', 'pe-1', 'pe-2', 'pe-3', 'pe-4', 'pe-5',
    'px-0', 'px-1', 'px-2', 'px-3', 'px-4', 'px-5',
    'py-0', 'py-1', 'py-2', 'py-3', 'py-4', 'py-5',

    // --- Text ---
    'text-start', 'text-center', 'text-end',
    'text-sm-start', 'text-md-center', 'text-lg-end',
    'text-lowercase', 'text-uppercase', 'text-capitalize',
    'text-wrap', 'text-nowrap', 'text-break', 'text-truncate',
    'text-decoration-none', 'text-decoration-underline', 'text-decoration-line-through',
    'fw-bold', 'fw-bolder', 'fw-semibold', 'fw-normal', 'fw-light', 'fw-lighter',
    'fst-italic', 'fst-normal',
    'lh-1', 'lh-sm', 'lh-base', 'lh-lg',
    'font-monospace',
    'fs-1', 'fs-2', 'fs-3', 'fs-4', 'fs-5', 'fs-6',
    // Text colors
    'text-primary', 'text-secondary', 'text-success', 'text-danger', 'text-warning',
    'text-info', 'text-light', 'text-dark', 'text-white', 'text-muted', 'text-body',
    'text-black', 'text-black-50', 'text-white-50', 'text-reset',
    // Background colors
    'bg-primary', 'bg-secondary', 'bg-success', 'bg-danger', 'bg-warning',
    'bg-info', 'bg-light', 'bg-dark', 'bg-white', 'bg-transparent', 'bg-body',
    'bg-gradient',

    // --- Borders ---
    'border', 'border-0', 'border-top', 'border-top-0', 'border-end', 'border-end-0',
    'border-bottom', 'border-bottom-0', 'border-start', 'border-start-0',
    'border-primary', 'border-secondary', 'border-success', 'border-danger',
    'border-warning', 'border-info', 'border-light', 'border-dark', 'border-white',
    'border-1', 'border-2', 'border-3', 'border-4', 'border-5',
    'rounded', 'rounded-0', 'rounded-1', 'rounded-2', 'rounded-3', 'rounded-4', 'rounded-5',
    'rounded-top', 'rounded-end', 'rounded-bottom', 'rounded-start',
    'rounded-circle', 'rounded-pill',

    // --- Buttons ---
    'btn', 'btn-sm', 'btn-lg',
    'btn-primary', 'btn-secondary', 'btn-success', 'btn-danger', 'btn-warning',
    'btn-info', 'btn-light', 'btn-dark', 'btn-link',
    'btn-outline-primary', 'btn-outline-secondary', 'btn-outline-success',
    'btn-outline-danger', 'btn-outline-warning', 'btn-outline-info',
    'btn-outline-light', 'btn-outline-dark',
    'btn-close', 'btn-group', 'btn-group-sm', 'btn-group-lg',
    'btn-group-vertical', 'btn-toolbar', 'btn-check',

    // --- Navigation ---
    'nav', 'nav-link', 'nav-item', 'nav-tabs', 'nav-pills', 'nav-fill', 'nav-justified',
    'navbar', 'navbar-brand', 'navbar-nav', 'navbar-toggler', 'navbar-toggler-icon',
    'navbar-collapse', 'navbar-text', 'navbar-expand', 'navbar-expand-sm',
    'navbar-expand-md', 'navbar-expand-lg', 'navbar-expand-xl', 'navbar-expand-xxl',
    'navbar-light', 'navbar-dark',
    'breadcrumb', 'breadcrumb-item',
    'pagination', 'page-item', 'page-link',

    // --- Cards ---
    'card', 'card-body', 'card-title', 'card-subtitle', 'card-text', 'card-link',
    'card-header', 'card-footer', 'card-img', 'card-img-top', 'card-img-bottom',
    'card-img-overlay', 'card-group', 'card-deck', 'card-columns',

    // --- Alerts ---
    'alert', 'alert-primary', 'alert-secondary', 'alert-success', 'alert-danger',
    'alert-warning', 'alert-info', 'alert-light', 'alert-dark',
    'alert-dismissible', 'alert-heading', 'alert-link',

    // --- Badges ---
    'badge', 'rounded-pill',

    // --- Forms ---
    'form-control', 'form-control-sm', 'form-control-lg', 'form-control-plaintext',
    'form-control-color', 'form-select', 'form-select-sm', 'form-select-lg',
    'form-check', 'form-check-input', 'form-check-label', 'form-check-inline',
    'form-switch', 'form-range', 'form-floating',
    'form-label', 'form-text', 'form-group',
    'input-group', 'input-group-text', 'input-group-sm', 'input-group-lg',
    'was-validated', 'needs-validation', 'valid-feedback', 'invalid-feedback',
    'is-valid', 'is-invalid',

    // --- Tables ---
    'table', 'table-sm', 'table-bordered', 'table-borderless', 'table-striped',
    'table-striped-columns', 'table-hover', 'table-responsive',
    'table-responsive-sm', 'table-responsive-md', 'table-responsive-lg',
    'table-primary', 'table-secondary', 'table-success', 'table-danger',
    'table-warning', 'table-info', 'table-light', 'table-dark',
    'caption-top', 'table-group-divider',

    // --- Modals ---
    'modal', 'modal-dialog', 'modal-dialog-centered', 'modal-dialog-scrollable',
    'modal-content', 'modal-header', 'modal-body', 'modal-footer',
    'modal-title', 'modal-sm', 'modal-lg', 'modal-xl', 'modal-fullscreen',
    'modal-backdrop', 'modal-open', 'modal-static',

    // --- Dropdowns ---
    'dropdown', 'dropdown-menu', 'dropdown-item', 'dropdown-toggle',
    'dropdown-divider', 'dropdown-header', 'dropdown-menu-end', 'dropdown-menu-start',
    'dropdown-menu-sm-end', 'dropdown-menu-md-start',
    'dropup', 'dropend', 'dropstart',

    // --- Accordion ---
    'accordion', 'accordion-item', 'accordion-header', 'accordion-body',
    'accordion-button', 'accordion-collapse', 'accordion-flush',

    // --- Carousel ---
    'carousel', 'carousel-inner', 'carousel-item', 'carousel-item-next',
    'carousel-item-prev', 'carousel-indicators', 'carousel-control-prev',
    'carousel-control-next', 'carousel-control-prev-icon', 'carousel-control-next-icon',
    'carousel-caption', 'carousel-fade', 'slide',

    // --- Toast / Tooltip / Popover ---
    'toast', 'toast-container', 'toast-header', 'toast-body',
    'tooltip', 'tooltip-inner', 'tooltip-arrow',
    'popover', 'popover-header', 'popover-body', 'popover-arrow',

    // --- Progress ---
    'progress', 'progress-bar', 'progress-bar-striped', 'progress-bar-animated',

    // --- Spinners ---
    'spinner-border', 'spinner-border-sm',
    'spinner-grow', 'spinner-grow-sm',

    // --- List Group ---
    'list-group', 'list-group-item', 'list-group-item-action',
    'list-group-numbered', 'list-group-flush',
    'list-group-item-primary', 'list-group-item-success', 'list-group-item-danger',
    'list-group-item-warning', 'list-group-item-info',

    // --- Sizing ---
    'w-25', 'w-50', 'w-75', 'w-100', 'w-auto',
    'h-25', 'h-50', 'h-75', 'h-100', 'h-auto',
    'mw-100', 'mh-100', 'min-vw-100', 'min-vh-100', 'vw-100', 'vh-100',

    // --- Position ---
    'position-static', 'position-relative', 'position-absolute',
    'position-fixed', 'position-sticky',
    'fixed-top', 'fixed-bottom', 'sticky-top', 'sticky-bottom',
    'top-0', 'top-50', 'top-100',
    'bottom-0', 'bottom-50', 'bottom-100',
    'start-0', 'start-50', 'start-100',
    'end-0', 'end-50', 'end-100',
    'translate-middle', 'translate-middle-x', 'translate-middle-y',

    // --- Visibility / Overflow ---
    'visible', 'invisible',
    'overflow-auto', 'overflow-hidden', 'overflow-visible', 'overflow-scroll',
    'overflow-x-auto', 'overflow-y-auto',

    // --- Shadow ---
    'shadow', 'shadow-sm', 'shadow-lg', 'shadow-none',

    // --- Ratio ---
    'ratio', 'ratio-1x1', 'ratio-4x3', 'ratio-16x9', 'ratio-21x9',

    // --- Offcanvas ---
    'offcanvas', 'offcanvas-start', 'offcanvas-end', 'offcanvas-top', 'offcanvas-bottom',
    'offcanvas-header', 'offcanvas-title', 'offcanvas-body',

    // --- Utilities ---
    'clearfix', 'float-start', 'float-end', 'float-none',
    'float-sm-start', 'float-md-end',
    'user-select-all', 'user-select-auto', 'user-select-none',
    'pe-none', 'pe-auto',
    'opacity-0', 'opacity-25', 'opacity-50', 'opacity-75', 'opacity-100',
    'cursor-pointer',
    'link-primary', 'link-secondary', 'link-success', 'link-danger',
    'link-warning', 'link-info', 'link-light', 'link-dark',
    'stretched-link',
    'visually-hidden', 'visually-hidden-focusable',
    'img-fluid', 'img-thumbnail',
    'figure', 'figure-img', 'figure-caption',
    'blockquote', 'blockquote-footer',
    'lead', 'display-1', 'display-2', 'display-3', 'display-4', 'display-5', 'display-6',
    'mark', 'small',
    'initialism', 'abbr',
    'close',
    'active', 'disabled', 'show', 'fade', 'collapse', 'collapsing',
    'sr-only', 'embed-responsive', 'embed-responsive-item',
];

/**
 * Registers a context-aware Bootstrap 5 class completion provider.
 * Only triggers inside HTML class="..." attribute values.
 */
export function registerBootstrapCompletions(monaco: any): any {
    return monaco.languages.registerCompletionItemProvider('html', {
        // Trigger on space, quote, or letter so it works everywhere inside class=""
        triggerCharacters: ['"', "'", ' ', '-', '\t'],
        provideCompletionItems(model: any, position: any) {
            // Get the full text of the current line up to the cursor
            const lineText = model.getValueInRange({
                startLineNumber: position.lineNumber,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
            });

            // Only activate completions when inside class="..." or class='...'
            const classAttrPattern = /class=["'][^"']*$/;
            if (!classAttrPattern.test(lineText)) return { suggestions: [] };

            // The partially typed class word (after last space)
            const typedWord = lineText.match(/(\S+)$/) ? lineText.match(/(\S+)$/)![1] : '';

            const word = model.getWordUntilPosition(position);
            const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: position.column - typedWord.length,
                endColumn: position.column,
            };
            // suppress word if no partial match
            void word;

            const suggestions = BOOTSTRAP5_CLASSES
                .filter(cls => cls.startsWith(typedWord) || typedWord === '')
                .map(cls => ({
                    label: cls,
                    kind: monaco.languages.CompletionItemKind.Value,
                    insertText: cls,
                    documentation: `Bootstrap 5: .${cls}`,
                    detail: `🅱️ Bootstrap 5`,
                    range,
                    sortText: `0_${cls}`, // Sort Bootstrap suggestions first
                }));

            return { suggestions };
        }
    });
}
