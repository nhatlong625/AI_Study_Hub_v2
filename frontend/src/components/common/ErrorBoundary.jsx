import React from 'react';

// Bắt lỗi xảy ra trong lúc render / lifecycle của cây component con, để một
// trang lỗi không làm React unmount toàn bộ app thành trang trắng.
// Lưu ý phạm vi: KHÔNG bắt được lỗi trong event handler, promise hay setTimeout
// - những chỗ đó phải tự try/catch hoặc .catch().
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error(error, {
      componentStack: info?.componentStack || null
    });
  }

  componentDidUpdate(prevProps) {
    // Đổi route thì bỏ trạng thái lỗi, để user bấm sang trang khác là dùng được
    // ngay thay vì phải F5.
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h1>
          <p className="text-sm text-gray-500 mb-5">
            This page failed to load. Try reloading, or move to another page.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors"
          >
            Reload page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
