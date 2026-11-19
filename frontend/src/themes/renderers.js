import RetroDesktopLayout from '../layouts/RetroDesktopLayout.jsx'
import BasicLayout from '../layouts/BasicLayout.jsx'
import MemoBoardLayout from '../layouts/MemoBoardLayout.jsx'
import EmotionalLayout from '../layouts/EmotionalLayout.jsx'
import SidebarCorkLayout from '../layouts/SidebarCorkLayout.jsx'
import PostitBoardLayout from '../layouts/PostitBoardLayout.jsx'

// 테마 ID → 화면(레이아웃) 컴포넌트. 여기에 등록된 테마만 선택 화면에서 고를 수 있다.
// 새 테마는 레이아웃을 만든 뒤 이 표에 한 줄을 추가한다. 예: emotional: EmotionalLayout
// 모든 레이아웃은 BasicLayout과 같은 props(tabs, themeControl, quote, space, status, slots,
// widgetSizes, onWidgetSizeChange, themeId)를 받고, themeControl(테마 버튼)을 반드시 화면에 배치한다.
export const THEME_RENDERERS = {
  'retro-desktop': RetroDesktopLayout,
  basic: BasicLayout,
  'memo-board': MemoBoardLayout,
  emotional: EmotionalLayout,
  'sidebar-cork': SidebarCorkLayout,
  'postit-board': PostitBoardLayout,
}

export const AVAILABLE_THEME_IDS = Object.keys(THEME_RENDERERS)
