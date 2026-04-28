frappe.provide("frappe.ui.form");
import hljs from './highlight/es/highlight.min.js';

// --- Standalone Preview Utility ---
// Extracted so it can be reused by both the sidebar Attachments list
// and individual Attach / Attach Image form controls.
frappe.ui.form.PreviewAttachment = class PreviewAttachment {
    static preview_attachment(file_url, file_name, is_peek = false, frm = null) {
        // Close any existing side peeks before opening a new one
        if (is_peek) {
            $('.side-peek-dialog').remove();
            $('body').removeClass('side-peek-open');
        }

        // Get all attachments to enable navigation from the form standard source
        const attachments = (frm && frm.attachments) ? frm.attachments.get_attachments() : [];
        let current_index = attachments.findIndex(a => a.file_url === file_url || a.file_name === file_name);

        const dialog = new frappe.ui.Dialog({
            title: `<div class="preview-title-container" style="display:flex; align-items:center; justify-content:space-between; width:100%;">
                        <span class="preview-title-text">${__("Preview")}: ${frappe.utils.escape_html(file_name)}</span>
                    </div>`,
            size: 'large',
            fields: [{ fieldtype: 'HTML', fieldname: 'preview_area' }],
            primary_action_label: __("Close"),
            primary_action() {
                dialog.hide();
            },
            on_hide() {
                PreviewAttachment.action_to_close_remove_modal(dialog);
            }
        });

        // Set up layout
        if (is_peek) dialog.$wrapper.addClass('side-peek-dialog');
        const preview_area = dialog.fields_dict.preview_area.$wrapper;

        // Navigation Logic
        const refresh_navigation = () => {
            if (attachments.length <= 1) return;

            const att = attachments[current_index];
            const name = att.file_name;
            const url = att.file_url;
            const ext = url.split('?')[0].split('.').pop().toLowerCase();

            // Update Header
            dialog.set_title(`<div class="preview-title-container" style="display:flex; align-items:center; justify-content:space-between; width:100%;">
                <span class="preview-title-text">Preview: ${frappe.utils.escape_html(name)}</span>
                <div class="preview-navigation">
                    <button class="nav-btn prev-file"><i class="octicon octicon-chevron-left"></i></button>
                    <span class="nav-count">${current_index + 1} / ${attachments.length}</span>
                    <button class="nav-btn next-file"><i class="octicon octicon-chevron-right"></i></button>
                </div>
            </div>`);

            // Re-render content
            PreviewAttachment.render_preview_content(preview_area, url, ext);

            // Re-bind navigation events (since title HTML was replaced)
            dialog.header.find('.prev-file').on('click', () => {
                current_index = (current_index - 1 + attachments.length) % attachments.length;
                refresh_navigation();
            });
            dialog.header.find('.next-file').on('click', () => {
                current_index = (current_index + 1) % attachments.length;
                refresh_navigation();
            });
        };

        // Initial render
        if (attachments.length > 1) {
            refresh_navigation();
        } else {
            const file_extension = file_url.split('?')[0].split('.').pop().toLowerCase();
            PreviewAttachment.render_preview_content(preview_area, file_url, file_extension);
        }

        dialog.show();

        if (is_peek) {
            $('body').addClass('side-peek-open');
            // Remove backdrop and prevent dialog from blocking interactions
            setTimeout(() => {
                const $backdrop = $('.modal-backdrop');
                if ($backdrop.length) $backdrop.remove();
                dialog.$wrapper.css('pointer-events', 'none');
                dialog.$wrapper.find('.modal-dialog').css('pointer-events', 'auto');
            }, 100);
            setTimeout(() => dialog.$wrapper.addClass('show'), 10);
        } else {
            PreviewAttachment.enable_resizable_dialog(dialog);
        }

        PreviewAttachment.additional_actions(dialog);
    }

    static render_preview_content(preview_area, file_url, file_extension) {
        // Render the file based on its type
        if (['jpg', 'jpeg', 'png', 'gif'].includes(file_extension)) {
            preview_area.html(`<img src="${frappe.utils.escape_html(file_url)}" class="preview-content" style="width: 100%; height: auto; max-height: 100%;">`);
        } else if (file_extension === 'pdf') {
            preview_area.html(`
                <iframe src="${frappe.utils.escape_html(file_url)}"
                    class="resizable-preview"
                    style="width: 100%; height: 700px; border: none;">
                </iframe>
            `);
        } else if (['txt', 'xml'].includes(file_extension)) {
            fetch(file_url)
                .then(response => response.text())
                .then(data => {
                    const language = file_extension === 'xml' ? 'xml' : 'plaintext';
                    preview_area.html(`<pre style='height: 100%; width:100%'><code class="hljs ${language}">${frappe.utils.escape_html(data)}</code></pre>`);
                    hljs.highlightAll();
                })
                .catch(error => {
                    preview_area.html(`<p>Failed to load the file content. ${error}</p>`);
                });
        } else if (file_extension === 'json') {
            const syntaxHighlight = (json) => {
                json = JSON.stringify(json, undefined, 4);
                return json.replace(
                    /("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(:)?|\b(true|false|null)\b|\b-?\d+(\.\d*)?([eE][+-]?\d+)?\b)/g,
                    (match) => {
                        let cls = 'number';
                        if (/^"/.test(match)) {
                            cls = /:$/.test(match) ? 'key' : 'string';
                        } else if (/true|false/.test(match)) {
                            cls = 'boolean';
                        } else if (/null/.test(match)) {
                            cls = 'null';
                        }
                        return `<span class="${cls}">${frappe.utils.escape_html(match)}</span>`;
                    }
                );
            };

            fetch(file_url)
                .then(response => response.json())
                .then(data => {
                    const formattedJson = JSON.stringify(data, null, 4);
                    preview_area.html(`
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <strong style="font-size: 16px;">JSON Preview</strong>
                            <button class="btn btn-primary btn-sm copy-json-btn">Copy</button>
                        </div>
                        <pre class="json-preview-content">${syntaxHighlight(data)}</pre>
                    `);
                    preview_area.find('.copy-json-btn').on('click', () => {
                        frappe.utils.copy_to_clipboard(formattedJson);
                        frappe.show_alert({message: __('JSON copied to clipboard!'), indicator: 'green'});
                    });
                })
                .catch(error => {
                    preview_area.html(`<p>Failed to load JSON content. ${error}</p>`);
                });
        } else if (file_extension === 'csv') {
            PreviewAttachment.render_csv_preview(preview_area, file_url);
        } else if (['mp4', 'avi', 'mov', 'webm'].includes(file_extension)) {
            preview_area.html(`
                <video controls class="preview-content" style="width: 100%;">
                    <source src="${frappe.utils.escape_html(file_url)}" type="video/${file_extension}">
                </video>
            `);
        } else if (file_extension === 'mp3') {
            preview_area.html(`
                <audio controls class="preview-content" style="width: 100%;">
                    <source src="${frappe.utils.escape_html(file_url)}" type="audio/mpeg">
                </audio>
            `);
        } else if (file_url.includes('google.com')) {
            preview_area.html(`
                <iframe src="${frappe.utils.escape_html(file_url)}?embedded=true" class="google-docs-preview" style="width: 100%; height: 600px; border: none;" allowfullscreen></iframe>
            `);
        } else {
            preview_area.html('<p>Preview not supported for this file type.</p>');
        }
    }

    static render_csv_preview(preview_area, file_url) {
        fetch(file_url)
            .then(response => response.text())
            .then(data => {
                const rows = data.split(/\r?\n/).filter(row => row.trim() !== "");
                if (rows.length === 0) {
                    preview_area.html('<p>CSV file is empty.</p>');
                    return;
                }

                const parseCSVLine = (text) => {
                    const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
                    return text.split(regex).map(col => col.replace(/^"|"$/g, '').trim());
                };

                const all_data = rows.map(parseCSVLine);
                const page_size = 50;
                let current_page = 0;
                const total_pages = Math.ceil((all_data.length - 1) / page_size);

                const render_page = (page) => {
                    const start = (page * page_size) + 1; // Skip header
                    const end = Math.min(start + page_size, all_data.length);
                    const page_data = all_data.slice(start, end);
                    const header = all_data[0];

                    let html = `
                        <div class="csv-preview-container">
                            <div class="csv-table-wrapper">
                                <table class="table table-bordered csv-table">
                                    <thead>
                                        <tr>${header.map(h => `<th>${frappe.utils.escape_html(h)}</th>`).join('')}</tr>
                                    </thead>
                                    <tbody>
                                        ${page_data.map(row => `<tr>${row.map(c => `<td>${frappe.utils.escape_html(c)}</td>`).join('')}</tr>`).join('')}
                                    </tbody>
                                </table>
                            </div>
                            <div class="csv-pagination">
                                <span class="text-muted small">Showing ${start} to ${end - 1} of ${all_data.length - 1} rows</span>
                                <div class="btn-group">
                                    <button class="btn btn-xs btn-default prev-page" ${page === 0 ? 'disabled' : ''}>Prev</button>
                                    <button class="btn btn-xs btn-default next-page" ${page >= total_pages - 1 ? 'disabled' : ''}>Next</button>
                                </div>
                            </div>
                        </div>
                    `;

                    preview_area.html(html);

                    preview_area.find('.prev-page').on('click', () => {
                        current_page--;
                        render_page(current_page);
                    });
                    preview_area.find('.next-page').on('click', () => {
                        current_page++;
                        render_page(current_page);
                    });
                };

                render_page(current_page);
            })
            .catch(error => {
                preview_area.html(`<p>Failed to load CSV content. ${error}</p>`);
            });
    }

    static enable_resizable_dialog(dialog) {
        const dialog_wrapper = dialog.$wrapper;
        const modal_body = dialog_wrapper.find('.modal-body');
        const iframe = modal_body.find('.google-docs-preview');
        const modal_content = dialog_wrapper.find('.modal-content');
        modal_content.css({
            resize: 'both',
            overflow: 'auto',
        });

        modal_body.on('mousemove mouseup', function () {
            const bodyWidth = modal_body.width();
            const bodyHeight = modal_body.height();
            iframe.css({
                width: `${bodyWidth}px`,
                height: `${bodyHeight}px`
            });
        });
        PreviewAttachment.dialog_draggable(dialog);
    }

    static dialog_draggable(dialog) {
        const dialog_wrapper = dialog.$wrapper;
        const modal_content = dialog_wrapper.find('.modal-content');
        const modal_header = modal_content.find('.modal-header');
        modal_content.css({ position: 'absolute' });

        let isDragging = false;
        let startX, startY, startLeft, startTop;

        modal_header.css({ cursor: 'move' });

        modal_header.on('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = parseFloat(modal_content.css('left')) || 0;
            startTop = parseFloat(modal_content.css('top')) || 0;
            modal_content.css('z-index', 1050);
        });

        $(document).on('mousemove.preview_attachment_drag', (e) => {
            if (isDragging) {
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                modal_content.css({
                    left: startLeft + dx + 'px',
                    top: startTop + dy + 'px'
                });
            }
        });

        $(document).on('mouseup.preview_attachment_drag', () => {
            isDragging = false;
        });
    }

    static additional_actions(dialog) {
        // No longer need to manually bind close button as on_hide handles it all
    }

    static action_to_close_remove_modal(dialog) {
        const dialog_wrapper = dialog.$wrapper;

        // Stop media playback (audio and video)
        dialog_wrapper.find('audio, video').each(function () {
            this.pause();
            this.currentTime = 0;
        });

        // Hide with animation if it's a peek
        if (dialog_wrapper.hasClass('side-peek-dialog')) {
            dialog_wrapper.removeClass('show');
            setTimeout(() => {
                dialog_wrapper.remove();
                $('body').removeClass('side-peek-open');
                $(".modal-backdrop").remove();
            }, 300);
        } else {
            dialog_wrapper.remove();
            $(".modal-backdrop").remove();
        }

        $(document).off('.preview_attachment_drag');
    }
};

// --- Attachments Sidebar Override ---
frappe.ui.form.Attachments = class Attachments extends frappe.ui.form.Attachments {
    constructor(...args) {
        super(...args);
    }

    make() {
        super.make();
        this.add_attachment_wrapper = this.parent.find(".attachments-actions");
    }

    add_attachment(attachment) {
        super.add_attachment(attachment);

        const file_name = attachment.file_name;
        const file_url = this.get_file_url(attachment);

        const attachment_row = this.add_attachment_wrapper.next().find(`a[href="${file_url}"]`).closest('.attachment-row');
        if (attachment_row.length) {
            // Add a compact preview button group with preview and side-peek buttons
            const preview_button = `
                <div class="attachment-btn-group">
                    <button class="btn btn-xs btn-secondary preview-btn"
                        data-file-url="${frappe.utils.escape_html(file_url)}"
                        title="Preview">
                        <i class="octicon octicon-eye-unwatch"></i>
                    </button>
                    <button class="btn btn-xs btn-secondary peek-btn"
                        data-file-url="${frappe.utils.escape_html(file_url)}"
                        title="Side Peek">
                        <i class="octicon octicon-browser"></i>
                    </button>
                </div>`;

            const $btn_group = $(preview_button);
            attachment_row.find('.data-pill').prepend($btn_group);

            $btn_group.find('.preview-btn').on('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                this.preview_attachment(file_url, file_name, false);
            });

            $btn_group.find('.peek-btn').on('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                this.preview_attachment(file_url, file_name, true);
            });
        }
    }

    preview_attachment(file_url, file_name, is_peek = false) {
        frappe.ui.form.PreviewAttachment.preview_attachment(file_url, file_name, is_peek, this.frm);
    }

    render_preview_content(preview_area, file_url, file_extension) {
        frappe.ui.form.PreviewAttachment.render_preview_content(preview_area, file_url, file_extension);
    }

    render_csv_preview(preview_area, file_url) {
        frappe.ui.form.PreviewAttachment.render_csv_preview(preview_area, file_url);
    }

    enable_resizable_dialog(dialog) {
        frappe.ui.form.PreviewAttachment.enable_resizable_dialog(dialog);
    }

    dialog_draggable(dialog) {
        frappe.ui.form.PreviewAttachment.dialog_draggable(dialog);
    }

    additional_actions(dialog) {
        frappe.ui.form.PreviewAttachment.additional_actions(dialog);
    }

    action_to_close_remove_modal(dialog) {
        frappe.ui.form.PreviewAttachment.action_to_close_remove_modal(dialog);
    }
};

// --- Helper: inject preview button into an Attach control's $value (left side, inside .ellipsis) ---
function inject_preview_btn_to_value(control) {
    if (!control.$value || control.$value.find('.preview-btn').length) return;

    let preview_btn = $(`
        <button class="btn btn-xs btn-default preview-btn" title="${__('Preview')}" style="margin-right: 6px;">
            <i class="octicon octicon-eye-unwatch"></i>
        </button>
    `);
    preview_btn.on('click', (e) => {
        e.preventDefault();
        let file_url = control.$value.find('.attached-file-link').attr('href');
        let file_name = control.$value.find('.attached-file-link').text();
        if (file_url) {
            frappe.ui.form.PreviewAttachment.preview_attachment(file_url, file_name, false, control.frm);
        }
    });

    let $ellipsis = control.$value.find('.ellipsis');
    if ($ellipsis.length) {
        $ellipsis.prepend(preview_btn);
    }
}

// --- Helper: inject preview button for the $wrapper fallback path (grid / read-only) ---
function inject_preview_btn_to_wrapper(control) {
    let $attached_file = control.$wrapper.find('.attached-file');
    if (!$attached_file.length || $attached_file.find('.preview-btn').length) return;

    let preview_btn = $(`
        <button class="btn btn-xs btn-default preview-btn" title="${__('Preview')}" style="margin-right: 6px;">
            <i class="octicon octicon-eye-unwatch"></i>
        </button>
    `);
    preview_btn.on('click', (e) => {
        e.preventDefault();
        let $link = control.$wrapper.find('.attached-file-link, .attached-file a').first();
        frappe.ui.form.PreviewAttachment.preview_attachment($link.attr('href'), $link.text(), false, control.frm);
    });

    let $ellipsis = $attached_file.find('.ellipsis');
    if ($ellipsis.length) {
        $ellipsis.prepend(preview_btn);
    } else {
        $attached_file.prepend(preview_btn);
    }
}

// --- Override ControlAttach so Attach fields also get a preview eye button ---
frappe.ui.form.ControlAttach = class ControlAttach extends frappe.ui.form.ControlAttach {
    make_input() {
        super.make_input();
        inject_preview_btn_to_value(this);
    }

    set_input(value, dataurl) {
        super.set_input(value, dataurl);
        if (this.value && this.$wrapper && (!this.$input || !this.$value)) {
            inject_preview_btn_to_wrapper(this);
        }
    }
};

// --- Explicitly override ControlAttachImage as well ---
// ControlAttachImage was defined extending the ORIGINAL ControlAttach before our
// override runs, so it does NOT inherit the preview button logic automatically.
frappe.ui.form.ControlAttachImage = class ControlAttachImage extends frappe.ui.form.ControlAttachImage {
    make_input() {
        super.make_input();
        inject_preview_btn_to_value(this);
    }

    set_input(value, dataurl) {
        super.set_input(value, dataurl);
        if (this.value && this.$wrapper && (!this.$input || !this.$value)) {
            inject_preview_btn_to_wrapper(this);
        }
    }
};
