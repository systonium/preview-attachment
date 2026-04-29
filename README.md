# Frappe Attachment Preview

This Frappe app introduces a functionality to preview file attachments directly within the Frappe framework. By adding an **icon** next to each attachment, users can quickly view the content of attached files without downloading them.

## Features

- **Preview Dialog**: Provides a dedicated icon for each attachment that opens a dialog box to preview the file when clicked.
- **Draggable and Resizable Dialog**: The preview dialog can be stretched, dragged, and moved for better usability.
- **Supports Multiple File Types**: View various file formats directly in the browser, including:
  - Images (JPG, PNG, GIF, WebP)
  - PDFs
  - Videos
  - Audio
  - Text Files
  - JSON Files
  - XML Files
  - CSV Files
- **Attach & Attach Image Field Preview**: Preview button also appears directly on form fields of type `Attach` and `Attach Image`.
- **Child Table Support**: Works inside grid/child table rows.
- **Attachment Navigation**: Browse between all document attachments using on-screen arrows or keyboard (← →).
- **Enhanced User Experience**: Saves time by allowing users to preview attachments without opening in a new tab.

## Screenshots


## Installation

Follow these steps to install and use the app:

1. **Clone the Repository**
   ```bash
   bench get-app https://github.com/systonium/preview-attachment.git
   ```
2. **Install the App**
    ```bash
   bench --site your-site-name install-app preview_attachment
   ```
3. **Restart Bench**
    ```bash
   bench restart
   ```

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests to improve this app.

1. Fork the repository.
2. Create a feature branch (`git checkout -b your-feature`).
3. Commit your changes (`git commit -m "Add your feature"`).
4. Push to the branch (`git push origin feature/your-feature`).
5. Open a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Attribution

This project combines work from multiple contributors:

- **Original preview attachment functionality** by [Hardik Zinzuvadiya (Z4nzu)](https://github.com/Z4nzu/frappe-preview-attachment)
- **Side-peek drawer, attachment navigation, CSV preview, and security improvements** by [kardmode](https://github.com/kardmode/frappe-preview-attachment)
- **Attach / Attach Image field preview, child table support, WebP support, and UI refinements** by [systonium](https://github.com/systonium/preview-attachment)
