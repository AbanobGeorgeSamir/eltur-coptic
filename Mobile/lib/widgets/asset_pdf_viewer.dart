import 'package:material_ui/material_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter_pdfview/flutter_pdfview.dart';

class AssetPdfViewer extends StatefulWidget {
  final String assetPath;
  final int initialPageNumber;

  const AssetPdfViewer({
    super.key,
    required this.assetPath,
    this.initialPageNumber = 1,
  });

  @override
  State<AssetPdfViewer> createState() => _AssetPdfViewerState();
}

class _AssetPdfViewerState extends State<AssetPdfViewer> {
  late final Future<Uint8List> _pdfBytes = _loadPdf();
  String? _viewerError;

  Future<Uint8List> _loadPdf() async {
    final data = await rootBundle.load(widget.assetPath);
    return data.buffer.asUint8List(data.offsetInBytes, data.lengthInBytes);
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<Uint8List>(
    future: _pdfBytes,
    builder: (context, snapshot) {
      if (snapshot.connectionState != ConnectionState.done) {
        return const Center(child: CircularProgressIndicator());
      }

      final error = _viewerError ?? snapshot.error?.toString();
      if (error != null) {
        return Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(
              'تعذر فتح ملف PDF.\n$error',
              textAlign: TextAlign.center,
            ),
          ),
        );
      }

      return PDFView(
        pdfData: snapshot.requireData,
        defaultPage: widget.initialPageNumber > 0
            ? widget.initialPageNumber - 1
            : 0,
        enableSwipe: true,
        swipeHorizontal: false,
        autoSpacing: true,
        pageFling: false,
        fitPolicy: FitPolicy.WIDTH,
        onError: (error) {
          if (mounted) setState(() => _viewerError = error.toString());
        },
      );
    },
  );
}
