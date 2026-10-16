import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const rootNode = document.getElementById('root')
const app = <StrictMode><App /></StrictMode>
if (rootNode.hasChildNodes()) {
  hydrateRoot(rootNode, app)
} else {
  createRoot(rootNode).render(app)
}
