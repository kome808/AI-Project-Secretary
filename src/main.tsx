import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/api/queryClient';
import App from "./app/App.tsx";
import "./styles/index.css";

console.log('🚀 main.tsx: 開始初始化應用程式...');

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    console.error('❌ 找不到 #root 元素');
  } else {
    console.log('✅ 找到 #root 元素，開始渲染...');
    const root = createRoot(rootElement);
    root.render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </StrictMode>
    );
    console.log('✅ render() 已呼叫');
  }
} catch (error) {
  console.error('❌ 渲染時發生錯誤:', error);
}
