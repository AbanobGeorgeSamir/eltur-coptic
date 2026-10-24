import * as pdfjsLib from 'pdfjs-dist';
import { EventBus, PDFLinkService, PDFViewer } from 'pdfjs-dist/web/pdf_viewer.mjs';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import './agpeya-reader.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const pageInput = document.querySelector('#pageNumber');
const pageCountLabel = document.querySelector('#pageCount');
const loadingStatus = document.querySelector('#loadingStatus');
const errorStatus = document.querySelector('#errorStatus');
const viewerContainer = document.querySelector('#viewerContainer');

function reportViewerError(error) {
  loadingStatus.hidden = true;
  errorStatus.textContent = 'تعذر عرض الكتاب. يمكنك تنزيل ملف الأجبية من الزر أعلى الصفحة.';
  errorStatus.hidden = false;
  console.error('Agpeya PDF viewer error:', error);
}

window.addEventListener('error', (event) => reportViewerError(event.error || event.message));
window.addEventListener('unhandledrejection', (event) => reportViewerError(event.reason));

const eventBus = new EventBus();
const linkService = new PDFLinkService({ eventBus });
const pdfViewer = new PDFViewer({
  container: viewerContainer,
  viewer: document.querySelector('#viewer'),
  eventBus,
  linkService,
});

linkService.setViewer(pdfViewer);

eventBus.on('pagesinit', () => {
  pdfViewer.currentScaleValue = 'page-width';

  const requestedPage = Number(new URLSearchParams(window.location.hash.slice(1)).get('page'));
  if (Number.isInteger(requestedPage) && requestedPage > 0 && requestedPage <= pdfViewer.pagesCount) {
    pdfViewer.currentPageNumber = requestedPage;
  }
});

eventBus.on('pagechanging', ({ pageNumber }) => {
  pageInput.value = String(pageNumber);
});

pageInput.addEventListener('change', () => {
  const requestedPage = Number(pageInput.value);
  if (Number.isInteger(requestedPage) && requestedPage > 0 && requestedPage <= pdfViewer.pagesCount) {
    pdfViewer.currentPageNumber = requestedPage;
  } else {
    pageInput.value = String(pdfViewer.currentPageNumber);
  }
});

document.querySelector('#zoomOut').addEventListener('click', () => {
  pdfViewer.currentScale = Math.max(0.5, pdfViewer.currentScale / 1.15);
});

document.querySelector('#zoomIn').addEventListener('click', () => {
  pdfViewer.currentScale = Math.min(3, pdfViewer.currentScale * 1.15);
});

document.querySelector('#fitWidth').addEventListener('click', () => {
  pdfViewer.currentScaleValue = 'page-width';
});

const loadingTask = pdfjsLib.getDocument({ url: '/agpeya.pdf' });
loadingTask.promise.then((pdfDocument) => {
  linkService.setDocument(pdfDocument);
  pdfViewer.setDocument(pdfDocument);
  pageCountLabel.textContent = `/ ${pdfDocument.numPages}`;
  loadingStatus.hidden = true;
}).catch(reportViewerError);

window.addEventListener('pagehide', () => loadingTask.destroy(), { once: true });
