frappe.provide("frappe.ui.form");
import hljs from './highlight/es/highlight.min.js';

// Standalone utility class for preview functionality so it can be reused
// by both the sidebar Attachments list and individual Attach/Attach Image fields.
frappe.ui.form.PreviewAttachment = class PreviewAttachment {
    static preview_attachment(file_url, file_name) {
        const dialog = new frappe.ui.Dialog({
            title: `Preview: ${file_name}`,
            size: 'large',
            fields: [{ fieldtype: 'HTML', fieldname: 'preview_area' }],
            primary_action_label: __("Close"),
            primary_action() {
                PreviewAttachment.action_to_close_remove_modal(dialog);
            }
        });

        const file_extension = file_url.split('.').pop().toLowerCase();
        const preview_area = dialog.fields_dict.preview_area.$wrapper;

        // Render the file based on its type
        if (['jpg', 'jpeg', 'png', 'gif'].includes(file_extension)) {
            preview_area.html(`<img src="${file_url}" class="preview-content" style="width: 100%; height: 100%;">`);
        } else if (file_extension === 'pdf') {
            preview_area.html(`
                <iframe src="${file_url}"
                    class="resizable-preview"
                    style="width: 100%; height: 700px; border: none;">
                </iframe>
            `);
        } else if (['txt', 'xml'].includes(file_extension)) {
            fetch(file_url)
                .then(response => response.text())
                .then(data => {
                    // Set the language type for Highlight.js
                    const language = file_extension === 'xml' ? 'xml' : 'plaintext';

                    // Create a pre > code block for Highlight.js
                    preview_area.html(`
                        <pre style='height: 100%; width:100%'><code class="hljs ${language}">${frappe.utils.escape_html(data)}</code></pre>
                    `);

                    hljs.highlightAll();
                })
                .catch(error => {
                    preview_area.html(`<p>Failed to load the file content. ${error}</p>`);
                });
        } else if (file_extension === 'json') {
            function syntaxHighlight(json) {
                json = JSON.stringify(json, undefined, 4);
                return json.replace(
                    /("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(:)?|\b(true|false|null)\b|\b-?\d+(\.\d*)?([eE][+-]?\d+)?\b)/g,
                    function (match) {
                        let cls = 'number';
                        if (/^"/.test(match)) {
                            if (/:$/.test(match)) {
                                cls = 'key';
                            } else {
                                cls = 'string';
                            }
                        } else if (/true|false/.test(match)) {
                            cls = 'boolean';
                        } else if (/null/.test(match)) {
                            cls = 'null';
                        }
                        return `<span class="${cls}">${match}</span>`;
                    }
                );
            }
            // For JSON files, fetch the content and display it
            fetch(file_url)
                .then(response => response.json())
                .then(data => {
                    // Pretty-print the JSON
                    const formattedJson = JSON.stringify(data, null, 4);
                    preview_area.html(`
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <strong style="font-size: 16px;">JSON Preview</strong>
                            <button class="btn btn-primary btn-sm copy-json-btn" style="font-size: 14px; padding: 5px 10px;">Copy</button>
                        </div>
                        <pre class="json-preview-content">${syntaxHighlight(data)}</pre>
                    `);
                    // Add click event for the "Copy" button
                    preview_area.find('.copy-json-btn').on('click', () => {
                        // Create a temporary textarea to hold the JSON content
                        const tempTextArea = $('<textarea>')
                            .css({ position: 'absolute', left: '-9999px' }) // Hide it off-screen
                            .val(formattedJson)
                            .appendTo('body');

                        tempTextArea.select(); // Select the content
                        document.execCommand('copy'); // Copy to clipboard
                        tempTextArea.remove(); // Remove the textarea

                        frappe.msgprint(__('JSON copied to clipboard!')); // Show success message
                    });
                })
                .catch(error => {
                    preview_area.html(`<p>Failed to load JSON content. ${error}</p>`);
                });
        } else if (['mp4', 'avi', 'mov', 'webm'].includes(file_extension)) {
            // For video files, use the HTML5 <video> element to preview
            preview_area.html(`
                <video controls class="preview-content" style="width: 100%; height: 100%;">
                    <source src="${file_url}" type="video/${file_extension}">
                    Your browser does not support the video tag.
                </video>
            `);
        } else if (file_extension === 'mp3') {
            // For MP3 files
            preview_area.html(`
                <audio controls class="preview-content" style="width: 100%;">
                    <source src="${file_url}" type="audio/mpeg">
                    Your browser does not support the audio tag.
                </audio>
            `);
        } else if (file_url.includes('google.com')) {
            // Google Drive or Docs preview
            preview_area.html(`
                <iframe src="${file_url}?embedded=true" class="google-docs-preview" style="width: 100%; height: 100%; border: none;" allowfullscreen></iframe>
            `);
        } else {
            preview_area.html('<p>Preview not supported for this file type.</p>');
        }

        dialog.show();
        // Make the dialog resizable via mouse
        PreviewAttachment.enable_resizable_dialog(dialog);
        PreviewAttachment.additional_actions(dialog);
    }

    static enable_resizable_dialog(dialog) {
        const dialog_wrapper = dialog.$wrapper;
        // Add resizable styles to the modal body
        const modal_body = dialog_wrapper.find('.modal-body');
        const iframe = modal_body.find('.google-docs-preview');
        const modal_content = dialog_wrapper.find('.modal-content');
        // Resize dialog-box
        modal_content.css({
            resize: 'both',
            overflow: 'auto',
        });

        // Listen for resize events and adjust the iframe height dynamically for google-doc
        modal_body.on('mousemove mouseup', function () {
            const bodyWidth = modal_body.width();
            const bodyHeight = modal_body.height();

            // Adjust iframe size to match modal body dimensions
            iframe.css({
                width: `${bodyWidth}px`,
                height: `${bodyHeight}px`
            });
        });
        // Make dialog moveable
        PreviewAttachment.dialog_draggable(dialog);
    }

    static dialog_draggable(dialog) {
        const dialog_wrapper = dialog.$wrapper;
        const modal_content = dialog_wrapper.find('.modal-content');
        const modal_header = modal_content.find('.modal-header');
        // Apply resizable styles to the modal content
        modal_content.css({
            position: 'absolute', // Required for moving
        });

        // Enable dragging functionality
        let isDragging = false;
        let startX, startY, startLeft, startTop;

        modal_header.css({
            cursor: 'move' // Visual cue for draggable area
        });

        // Mouse down on the header starts the dragging
        modal_header.on('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = modal_content.offset().left;
            startTop = modal_content.offset().top;
            modal_content.css('z-index', 1050); // Ensure it stays on top
        });

        // Mouse move moves the dialog
        $(document).on('mousemove', (e) => {
            if (isDragging) {
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                modal_content.css({
                    left: startLeft + dx + 'px',
                    top: startTop + dy + 'px'
                });
            }
        });

        // Mouse up ends the dragging
        $(document).on('mouseup', () => {
            isDragging = false;
        });
    }

    static additional_actions(dialog) {
        dialog.get_close_btn().on("click", () => {
            PreviewAttachment.action_to_close_remove_modal(dialog);
        });
    }

    // Pause videos or reset iframe when dialog is closed
    static action_to_close_remove_modal(dialog) {
        const dialog_wrapper = dialog.$wrapper;
        dialog.hide();
        // Stop media playback (audio and video)
        dialog_wrapper.find('audio, video').each(function () {
            this.pause();
            this.currentTime = 0;
        });

        // Reset iframes
        dialog_wrapper.find('iframe').each(function () {
            const src = $(this).attr('src');
            $(this).attr('src', ''); // Stop iframe activity
            $(this).attr('src', src); // Reassign original source
        });
        dialog.$wrapper.remove();
        $(".modal-backdrop").remove();
    }
};

// Helper: inject preview button into an Attach control's $value (left side, inside .ellipsis)
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
            frappe.ui.form.PreviewAttachment.preview_attachment(file_url, file_name);
        }
    });

    // Insert inside .ellipsis at the beginning so it appears on the LEFT side
    let $ellipsis = control.$value.find('.ellipsis');
    if ($ellipsis.length) {
        $ellipsis.prepend(preview_btn);
    }
}

// Helper: inject preview button for the $wrapper fallback path (grid/read-only)
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
        frappe.ui.form.PreviewAttachment.preview_attachment($link.attr('href'), $link.text());
    });

    // Insert inside .ellipsis at the beginning so it appears on the LEFT side
    let $ellipsis = $attached_file.find('.ellipsis');
    if ($ellipsis.length) {
        $ellipsis.prepend(preview_btn);
    } else {
        $attached_file.prepend(preview_btn);
    }
}

// Override Attachments sidebar to inject preview eye button
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

        // Get the necessary data
        const file_name = attachment.file_name;
        const file_url = this.get_file_url(attachment);

        // Add logic to modify the rendered attachment row
        const attachment_row = this.add_attachment_wrapper.next().find(`a[href="${file_url}"]`).closest('.attachment-row');
        if (attachment_row.length) {

            // Add a preview button next to the existing attachment details
            const preview_button = `
                <button class="btn btn-xs btn-secondary preview-btn"
                    data-file-url="${file_url}"
                    title="Preview ${frappe.utils.escape_html(file_name)}"
                    style="margin-left: 0px;">
                    <i class="octicon octicon-eye-unwatch"></i>
                </button>`;

            // Append the preview button to the attachment row
            attachment_row.find('.data-pill').prepend(preview_button);

            // Add click event for the preview button
            attachment_row.find(`.preview-btn[data-file-url="${file_url}"]`).on('click', () => {
                frappe.ui.form.PreviewAttachment.preview_attachment(file_url, file_name);
            });
        }
    }
};

// Override ControlAttach so Attach fields also get a preview eye button.
frappe.ui.form.ControlAttach = class ControlAttach extends frappe.ui.form.ControlAttach {
    make_input() {
        super.make_input();
        inject_preview_btn_to_value(this);
    }

    set_input(value, dataurl) {
        super.set_input(value, dataurl);
        // Handle the fallback case where the control renders directly into $wrapper
        if (this.value && this.$wrapper && (!this.$input || !this.$value)) {
            inject_preview_btn_to_wrapper(this);
        }
    }
};

// Explicitly override ControlAttachImage as well.
// ControlAttachImage was defined extending the ORIGINAL ControlAttach before our
// override runs, so it does NOT inherit the preview button logic automatically.
frappe.ui.form.ControlAttachImage = class ControlAttachImage extends frappe.ui.form.ControlAttachImage {
    make_input() {
        super.make_input();
        inject_preview_btn_to_value(this);
    }

    set_input(value, dataurl) {
        super.set_input(value, dataurl);
        // Handle the fallback case where the control renders directly into $wrapper
        if (this.value && this.$wrapper && (!this.$input || !this.$value)) {
            inject_preview_btn_to_wrapper(this);
        }
    }
};
