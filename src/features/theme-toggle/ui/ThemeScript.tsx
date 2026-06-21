import { THEME_STORAGE_KEY } from "../model";

/**
 * 페인트 전에 localStorage 값을 읽어 <html data-theme>를 세팅한다.
 * React 하이드레이션보다 먼저 동기 실행돼야 다크/라이트 깜빡임(FOUC)이 없다.
 */
export function ThemeScript() {
  const code = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
    THEME_STORAGE_KEY
  )});if(t==="dark"||t==="light"){document.documentElement.setAttribute("data-theme",t);}}catch(e){}})();`;

  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
