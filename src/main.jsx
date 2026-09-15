import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'

console.log('main.jsx ejecutándose')          // <-- agregar
const rootEl = document.getElementById('root')
console.log('rootEl encontrado:', rootEl)     // <-- agregar

ReactDOM.createRoot(rootEl).render(<React.StrictMode><App /></React.StrictMode>)