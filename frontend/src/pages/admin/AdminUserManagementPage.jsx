import { useEffect, useState } from 'react';
import logoImg from '../../assets/images/logo.jpg';
import { adminService } from '../../services/adminService';

const USERS_PER_PAGE = 12;

// Backend trả tên gói viết HOA (BASIC/PLUS/...); hiển thị dạng "Basic", "Plus" cho gọn.
const titleCasePlan = (value) => {
  const text = String(value || '').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1).toLowerCase() : '';
};

function UserManagementPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewUser, setViewUser] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [usersData, setUsersData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [planOptions, setPlanOptions] = useState(['Basic', 'Plus', 'Pro']);

  const loadPlans = async () => {
    try {
      const rows = await adminService.getPlanVersions();
      // getPlanVersions trả về từng version; gom lại tên gói duy nhất (kể cả gói tự thêm).
      const names = [];
      (Array.isArray(rows) ? rows : []).forEach((row) => {
        const name = titleCasePlan(row.plan);
        if (name && !names.includes(name)) names.push(name);
      });
      if (names.length) setPlanOptions(names);
    } catch {
      // Giữ nguyên danh sách mặc định nếu không tải được.
    }
  };

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      setError('');
      const users = await adminService.getUsers();
      setUsersData(users);
    } catch (err) {
      setError(err.message);
      setUsersData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    loadPlans();
  }, []);

  const getUserRole = (user) => user.role || 'User';
  const getUserPlan = (user) => user.plan || 'Basic';
  const getBadgeKey = (value) => String(value || '').toLowerCase();

  const filteredUsers = usersData.filter(user =>
    String(user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    getUserRole(user).toLowerCase().includes(searchTerm.toLowerCase()) ||
    getUserPlan(user).toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * USERS_PER_PAGE;
  const paginatedUsers = filteredUsers.slice(pageStartIndex, pageStartIndex + USERS_PER_PAGE);
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const openEdit = (user) => {
    setEditUser(user);
    setEditForm({ name: user.name, email: user.email, role: getUserRole(user), plan: getUserPlan(user) });
  };

  const closeAll = () => {
    setViewUser(null);
    setEditUser(null);
    setDeleteUser(null);
    setEditForm({});
    setError('');
  };

  const handleSaveUser = async () => {
    try {
      setIsSaving(true);
      setError('');

      if (editUser.id === 'new') {
        await adminService.createUser({
          ...editUser,
          ...editForm,
          folders: 0,
          tests: 0,
          type: 'initials',
        });
      } else {
        await adminService.updateUser(editUser.id, {
          ...editUser,
          ...editForm,
        });
      }

      await loadUsers();
      closeAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    try {
      setIsSaving(true);
      setError('');
      await adminService.deleteUser(deleteUser.id);
      await loadUsers();
      closeAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Helper: render avatar
  const renderAvatar = (user, size = 'sm') => {
    const cls = size === 'lg' ? 'modal-avatar-lg' : 'user-avatar-wrapper';
    if (user.type === 'logo') {
      return (
        <div className={`${cls} avatar-logo-bg`}>
          <img src={logoImg} alt="logo" className="avatar-logo" />
        </div>
      );
    }
    return (
      <div className={cls} style={{ backgroundColor: user.color, color: user.textColor }}>
        {user.initials}
      </div>
    );
  };

  return (
    <div className="admin-user-mgmt-container">

      {/* ──────── MODAL OVERLAY ──────── */}
      {(viewUser || editUser || deleteUser) && (
        <div className="modal-backdrop" onClick={closeAll} />
      )}

      {/* ──────── VIEW MODAL ──────── */}
      {viewUser && (
        <div className="modal-wrapper">
          <div className="modal-card modal-view" role="dialog" aria-modal="true">
            {/* Purple header */}
            <div className="view-modal-header">
              <button className="modal-close-circle" onClick={closeAll} aria-label="Close">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
              </button>
              <button className="view-edit-btn" onClick={() => { closeAll(); openEdit(viewUser); }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l.5-5.5L17 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Edit User
              </button>
              {/* Big avatar */}
              <div className="view-avatar-ring">
                {renderAvatar(viewUser, 'lg')}
              </div>
            </div>

            {/* Body */}
            <div className="view-modal-body">
              <h2 className="view-modal-name">{viewUser.name}</h2>
              <p className="view-modal-email">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ verticalAlign: 'middle', marginRight: 4 }}><rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" stroke="currentColor" strokeWidth="2"/></svg>
                {viewUser.email}
              </p>
              <div className="view-badges-row">
                <span className={`role-badge role-${getBadgeKey(getUserRole(viewUser))}`}>
                  {/* SVG 1: Shield person – USER badge */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="12" viewBox="0 0 11 12" fill="none" style={{ marginRight: 5, verticalAlign: 'middle' }}>
                    <path d="M7.58333 8.75C7.82639 8.75 8.03299 8.66493 8.20312 8.49479C8.37326 8.32465 8.45833 8.11806 8.45833 7.875C8.45833 7.63194 8.37326 7.42535 8.20312 7.25521C8.03299 7.08507 7.82639 7 7.58333 7C7.34028 7 7.13368 7.08507 6.96354 7.25521C6.7934 7.42535 6.70833 7.63194 6.70833 7.875C6.70833 8.11806 6.7934 8.32465 6.96354 8.49479C7.13368 8.66493 7.34028 8.75 7.58333 8.75ZM7.58333 10.5C7.88472 10.5 8.16181 10.4295 8.41458 10.2885C8.66736 10.1476 8.87153 9.96042 9.02708 9.72708C8.81319 9.60069 8.58472 9.50347 8.34167 9.43542C8.09861 9.36736 7.84583 9.33333 7.58333 9.33333C7.32083 9.33333 7.06806 9.36736 6.825 9.43542C6.58194 9.50347 6.35347 9.60069 6.13958 9.72708C6.29514 9.96042 6.49931 10.1476 6.75208 10.2885C7.00486 10.4295 7.28194 10.5 7.58333 10.5ZM4.66667 11.6667C3.31528 11.3264 2.19965 10.551 1.31979 9.34062C0.439931 8.13021 0 6.78611 0 5.30833V1.75L4.66667 0L9.33333 1.75V5.06042C9.14861 4.98264 8.95903 4.91215 8.76458 4.84896C8.57014 4.78576 8.37083 4.73958 8.16667 4.71042V2.56667L4.66667 1.25417L1.16667 2.56667V5.30833C1.16667 5.76528 1.22743 6.22222 1.34896 6.67917C1.47049 7.13611 1.64062 7.57118 1.85938 7.98438C2.07812 8.39757 2.34306 8.77917 2.65417 9.12917C2.96528 9.47917 3.31042 9.77083 3.68958 10.0042C3.79653 10.3153 3.9375 10.6118 4.1125 10.8938C4.2875 11.1757 4.48681 11.4285 4.71042 11.6521C4.70069 11.6521 4.6934 11.6545 4.68854 11.6594C4.68368 11.6642 4.67639 11.6667 4.66667 11.6667ZM7.58333 11.6667C6.77639 11.6667 6.08854 11.3823 5.51979 10.8135C4.95104 10.2448 4.66667 9.55694 4.66667 8.75C4.66667 7.94306 4.95104 7.25521 5.51979 6.68646C6.08854 6.11771 6.77639 5.83333 7.58333 5.83333C8.39028 5.83333 9.07812 6.11771 9.64688 6.68646C10.2156 7.25521 10.5 7.94306 10.5 8.75C10.5 9.55694 10.2156 10.2448 9.64688 10.8135C9.07812 11.3823 8.39028 11.6667 7.58333 11.6667Z" fill="currentColor"/>
                  </svg>
                  {getUserRole(viewUser)}
                </span>
                <span className={`plan-badge plan-${getBadgeKey(getUserPlan(viewUser))}`}>
                  {/* SVG 2: Medal – PRO PLAN badge */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="13" viewBox="0 0 10 13" fill="none" style={{ marginRight: 5, verticalAlign: 'middle' }}>
                    <path d="M3.31042 6.825L3.82083 5.1625L2.47917 4.08333H4.14167L4.66667 2.45L5.19167 4.08333H6.85417L5.49792 5.1625L6.00833 6.825L4.66667 5.78958L3.31042 6.825ZM1.16667 12.25V7.74375C0.797222 7.33542 0.510417 6.86875 0.30625 6.34375C0.102083 5.81875 0 5.25972 0 4.66667C0 3.36389 0.452083 2.26042 1.35625 1.35625C2.26042 0.452083 3.36389 0 4.66667 0C5.96944 0 7.07292 0.452083 7.97708 1.35625C8.88125 2.26042 9.33333 3.36389 9.33333 4.66667C9.33333 5.25972 9.23125 5.81875 9.02708 6.34375C8.82292 6.86875 8.53611 7.33542 8.16667 7.74375V12.25L4.66667 11.0833L1.16667 12.25ZM4.66667 8.16667C5.63889 8.16667 6.46528 7.82639 7.14583 7.14583C7.82639 6.46528 8.16667 5.63889 8.16667 4.66667C8.16667 3.69444 7.82639 2.86806 7.14583 2.1875C6.46528 1.50694 5.63889 1.16667 4.66667 1.16667C3.69444 1.16667 2.86806 1.50694 2.1875 2.1875C1.50694 2.86806 1.16667 3.69444 1.16667 4.66667C1.16667 5.63889 1.50694 6.46528 2.1875 7.14583C2.86806 7.82639 3.69444 8.16667 4.66667 8.16667ZM2.33333 10.5146L4.66667 9.91667L7 10.5146V8.70625C6.65972 8.90069 6.29271 9.05382 5.89896 9.16562C5.50521 9.27743 5.09444 9.33333 4.66667 9.33333C4.23889 9.33333 3.82812 9.27743 3.43438 9.16562C3.04063 9.05382 2.67361 8.90069 2.33333 8.70625V10.5146Z" fill="currentColor"/>
                  </svg>
                  {getUserPlan(viewUser)} Plan
                </span>
                <span className="view-status-badge">
                  {/* SVG 3: Shield check – ACTIVE badge */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="12" viewBox="0 0 10 12" fill="none" style={{ marginRight: 5, verticalAlign: 'middle' }}>
                    <path d="M4.05417 7.90417L7.35 4.60833L6.51875 3.77708L4.05417 6.24167L2.82917 5.01667L1.99792 5.84792L4.05417 7.90417ZM4.66667 11.6667C3.31528 11.3264 2.19965 10.551 1.31979 9.34062C0.439931 8.13021 0 6.78611 0 5.30833V1.75L4.66667 0L9.33333 1.75V5.30833C9.33333 6.78611 8.8934 8.13021 8.01354 9.34062C7.13368 10.551 6.01806 11.3264 4.66667 11.6667ZM4.66667 10.4417C5.67778 10.1208 6.51389 9.47917 7.175 8.51667C7.83611 7.55417 8.16667 6.48472 8.16667 5.30833V2.55208L4.66667 1.23958L1.16667 2.55208V5.30833C1.16667 6.48472 1.49722 7.55417 2.15833 8.51667C2.81944 9.47917 3.65556 10.1208 4.66667 10.4417Z" fill="currentColor"/>
                  </svg>
                  Active
                </span>
              </div>

              <div className="view-section-title">Activity Overview</div>
              <div className="view-activity-grid">
                {/* Total Folders – SVG 4: Folder blue */}
                <div className="view-activity-item">
                  <div className="view-activity-icon" style={{ background: '#e8eeff' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="16" viewBox="0 0 20 16" fill="none">
                      <path d="M2 16C1.45 16 0.979167 15.8042 0.5875 15.4125C0.195833 15.0208 0 14.55 0 14V2C0 1.45 0.195833 0.979167 0.5875 0.5875C0.979167 0.195833 1.45 0 2 0H8L10 2H18C18.55 2 19.0208 2.19583 19.4125 2.5875C19.8042 2.97917 20 3.45 20 4V14C20 14.55 19.8042 15.0208 19.4125 15.4125C19.0208 15.8042 18.55 16 18 16H2Z" fill="#4648D4"/>
                    </svg>
                  </div>
                  <div>
                    <div className="view-activity-label">Total Folders</div>
                    <div className="view-activity-value">{viewUser.folders}</div>
                  </div>
                </div>

                {/* Tests Created – SVG 5: Document with question mark */}
                <div className="view-activity-item">
                  <div className="view-activity-icon" style={{ background: '#ede9fe' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M12 13C12.2833 13 12.5292 12.8958 12.7375 12.6875C12.9458 12.4792 13.05 12.2333 13.05 11.95C13.05 11.6667 12.9458 11.4208 12.7375 11.2125C12.5292 11.0042 12.2833 10.9 12 10.9C11.7167 10.9 11.4708 11.0042 11.2625 11.2125C11.0542 11.4208 10.95 11.6667 10.95 11.95C10.95 12.2333 11.0542 12.4792 11.2625 12.6875C11.4708 12.8958 11.7167 13 12 13ZM11.25 9.8H12.75C12.75 9.31667 12.8 8.9625 12.9 8.7375C13 8.5125 13.2333 8.21667 13.6 7.85C14.1 7.35 14.4333 6.94583 14.6 6.6375C14.7667 6.32917 14.85 5.96667 14.85 5.55C14.85 4.8 14.5875 4.1875 14.0625 3.7125C13.5375 3.2375 12.85 3 12 3C11.3167 3 10.7208 3.19167 10.2125 3.575C9.70417 3.95833 9.35 4.46667 9.15 5.1L10.5 5.65C10.65 5.23333 10.8542 4.92083 11.1125 4.7125C11.3708 4.50417 11.6667 4.4 12 4.4C12.4 4.4 12.725 4.5125 12.975 4.7375C13.225 4.9625 13.35 5.26667 13.35 5.65C13.35 5.88333 13.2833 6.10417 13.15 6.3125C13.0167 6.52083 12.7833 6.78333 12.45 7.1C11.9 7.58333 11.5625 7.9625 11.4375 8.2375C11.3125 8.5125 11.25 9.03333 11.25 9.8ZM6 16C5.45 16 4.97917 15.8042 4.5875 15.4125C4.19583 15.0208 4 14.55 4 14V2C4 1.45 4.19583 0.979167 4.5875 0.5875C4.97917 0.195833 5.45 0 6 0H18C18.55 0 19.0208 0.195833 19.4125 0.5875C19.8042 0.979167 20 1.45 20 2V14C20 14.55 19.8042 15.0208 19.4125 15.4125C19.0208 15.8042 18.55 16 18 16H6ZM2 20C1.45 20 0.979167 19.8042 0.5875 19.4125C0.195833 19.0208 0 18.55 0 18V4H2V18H16V20H2Z" fill="#674BB5"/>
                    </svg>
                  </div>
                  <div>
                    <div className="view-activity-label">Tests Created</div>
                    <div className="view-activity-value">{viewUser.tests}</div>
                  </div>
                </div>
              </div>

              {/* Last Login + Location – single full-width row */}
              <div className="view-activity-row-single">
                {/* Last Login – left side: plain icon + text */}
                <div className="view-activity-row-item">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none" className="view-row-icon">
                    <path d="M13.3 14.7L14.7 13.3L11 9.6V5H9V10.4L13.3 14.7ZM10 20C8.61667 20 7.31667 19.7375 6.1 19.2125C4.88333 18.6875 3.825 17.975 2.925 17.075C2.025 16.175 1.3125 15.1167 0.7875 13.9C0.2625 12.6833 0 11.3833 0 10C0 8.61667 0.2625 7.31667 0.7875 6.1C1.3125 4.88333 2.025 3.825 2.925 2.925C3.825 2.025 4.88333 1.3125 6.1 0.7875C7.31667 0.2625 8.61667 0 10 0C11.3833 0 12.6833 0.2625 13.9 0.7875C15.1167 1.3125 16.175 2.025 17.075 2.925C17.975 3.825 18.6875 4.88333 19.2125 6.1C19.7375 7.31667 20 8.61667 20 10C20 11.3833 19.7375 12.6833 19.2125 13.9C18.6875 15.1167 17.975 16.175 17.075 17.075C16.175 17.975 15.1167 18.6875 13.9 19.2125C12.6833 19.7375 11.3833 20 10 20ZM10 18C12.2167 18 14.1042 17.2208 15.6625 15.6625C17.2208 14.1042 18 12.2167 18 10C18 7.78333 17.2208 5.89583 15.6625 4.3375C14.1042 2.77917 12.2167 2 10 2C7.78333 2 5.89583 2.77917 4.3375 4.3375C2.77917 5.89583 2 7.78333 2 10C2 12.2167 2.77917 14.1042 4.3375 15.6625C5.89583 17.2208 7.78333 18 10 18Z" fill="#8c8a9e"/>
                  </svg>
                  <div>
                    <div className="view-activity-label">Last Login</div>
                    <div className="view-activity-row-value">{viewUser.lastLogin}</div>
                  </div>
                </div>

                {/* Location – right side: text only, no icon */}
                <div className="view-activity-row-item view-activity-row-item--right">
                  <div>
                    <div className="view-activity-label">Location</div>
                    <div className="view-activity-row-value">{viewUser.location}</div>
                  </div>
                </div>
              </div>


              <div className="view-latest-action">
                <div className="view-latest-action-title">
                  {/* SVG 7: Refresh/redo – Latest Action */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 12C4.46667 12 3.13056 11.4917 1.99167 10.475C0.852778 9.45833 0.2 8.18889 0.0333333 6.66667H1.4C1.55556 7.82222 2.06944 8.77778 2.94167 9.53333C3.81389 10.2889 4.83333 10.6667 6 10.6667C7.3 10.6667 8.40278 10.2139 9.30833 9.30833C10.2139 8.40278 10.6667 7.3 10.6667 6C10.6667 4.7 10.2139 3.59722 9.30833 2.69167C8.40278 1.78611 7.3 1.33333 6 1.33333C5.23333 1.33333 4.51667 1.51111 3.85 1.86667C3.18333 2.22222 2.62222 2.71111 2.16667 3.33333H4V4.66667H0V0.666667H1.33333V2.23333C1.9 1.52222 2.59167 0.972222 3.40833 0.583333C4.225 0.194444 5.08889 0 6 0C6.83333 0 7.61389 0.158333 8.34167 0.475C9.06944 0.791667 9.70278 1.21944 10.2417 1.75833C10.7806 2.29722 11.2083 2.93056 11.525 3.65833C11.8417 4.38611 12 5.16667 12 6C12 6.83333 11.8417 7.61389 11.525 8.34167C11.2083 9.06944 10.7806 9.70278 10.2417 10.2417C9.70278 10.7806 9.06944 11.2083 8.34167 11.525C7.61389 11.8417 6.83333 12 6 12ZM7.86667 8.8L5.33333 6.26667V2.66667H6.66667V5.73333L8.8 7.86667L7.86667 8.8Z" fill="#4648D4"/>
                  </svg>
                  Latest Action
                </div>
                <p className="view-latest-action-text">{viewUser.latestAction}</p>
                <span className="view-latest-action-time">{viewUser.actionTime}</span>
              </div>
            </div>

            {/* Footer actions */}
            <div className="view-modal-footer">
              <button className="view-suspend-btn" type="button">Suspend Access</button>
              <button className="view-message-btn" type="button">Message User</button>
            </div>
          </div>
        </div>
      )}

      {/* ──────── EDIT MODAL ──────── */}
      {editUser && (
        <div className="modal-wrapper">
          <div className="modal-card modal-edit" role="dialog" aria-modal="true">
            <div className="edit-modal-header">
              <div className="edit-modal-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l.5-5.5L17 3Z" stroke="#4648D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div>
                <h3 className="edit-modal-title">Edit User Details</h3>
                <p className="edit-modal-subtitle">Updating profile for {editUser.name}</p>
              </div>
              <button className="modal-close-btn" onClick={closeAll} aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
              </button>
            </div>

            <div className="edit-modal-body">
              {error && (
                <div className="text-gray" style={{ marginBottom: '16px', color: '#dc2626' }}>
                  {error}
                </div>
              )}

              <div className="edit-form-group">
                <label className="edit-form-label">Full Name</label>
                <div className="edit-input-wrapper">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="edit-input-icon"><circle cx="12" cy="8" r="4" stroke="#8c8a9e" strokeWidth="2"/><path d="M4 20c0-4 3.58-7 8-7s8 3 8 7" stroke="#8c8a9e" strokeWidth="2" strokeLinecap="round"/></svg>
                  <input
                    type="text"
                    className="edit-form-input"
                    value={editForm.name || ''}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
              </div>

              <div className="edit-form-group">
                <label className="edit-form-label">Email Address</label>
                <div className="edit-input-wrapper">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="edit-input-icon"><rect x="2" y="4" width="20" height="16" rx="2" stroke="#8c8a9e" strokeWidth="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" stroke="#8c8a9e" strokeWidth="2"/></svg>
                  <input
                    type="email"
                    className="edit-form-input"
                    value={editForm.email || ''}
                    onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                  />
                </div>
              </div>

              <div className="edit-form-row">
                <div className="edit-form-group">
                  <label className="edit-form-label">System Role</label>
                  <div className="edit-select-wrapper">
                    <select
                      className="edit-form-select"
                      value={editForm.role || ''}
                      onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                    >
                      <option>Admin</option>
                      <option>Student</option>
                    </select>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="edit-select-chevron"><path d="m6 9 6 6 6-6" stroke="#8c8a9e" strokeWidth="2" strokeLinecap="round"/></svg>
                  </div>
                </div>
                <div className="edit-form-group">
                  <label className="edit-form-label">Subscription Plan</label>
                  <div className="edit-select-wrapper">
                    {(() => {
                      // Khớp gói hiện tại của user với option (không phân biệt hoa/thường) để
                      // tránh nhân đôi mục do lệch chữ hoa (vd "NQS" vs "Nqs").
                      const matched = planOptions.find(
                        name => name.toLowerCase() === String(editForm.plan || '').toLowerCase()
                      );
                      const selected = matched || editForm.plan || '';
                      const options = matched || !selected ? planOptions : [selected, ...planOptions];
                      return (
                        <select
                          className="edit-form-select"
                          value={selected}
                          onChange={e => setEditForm(f => ({ ...f, plan: e.target.value }))}
                        >
                          {options.map(name => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </select>
                      );
                    })()}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="edit-select-chevron"><path d="m6 9 6 6 6-6" stroke="#8c8a9e" strokeWidth="2" strokeLinecap="round"/></svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="edit-modal-footer">
              <button className="edit-cancel-btn" type="button" onClick={closeAll}>Cancel</button>
              <button className="edit-save-btn" type="button" onClick={handleSaveUser} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────── DELETE MODAL ──────── */}
      {deleteUser && (
        <div className="modal-wrapper">
          <div className="modal-card modal-delete" role="dialog" aria-modal="true">
            <div className="delete-modal-header">
              <div className="delete-warning-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="12" y1="9" x2="12" y2="13" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="17" r="1" fill="#ef4444"/></svg>
              </div>
              <h3 className="delete-modal-title">Delete User Confirmation</h3>
              <p className="delete-modal-subtitle">Are you sure you want to delete this user? This action cannot be undone and will permanently remove all associated data.</p>
            </div>

            <div className="delete-user-preview">
              {renderAvatar(deleteUser)}
              <div>
                <div className="delete-preview-name">{deleteUser.name}</div>
                <div className="delete-preview-role">Standard User</div>
              </div>
            </div>

            <div className="delete-modal-footer">
              <button className="delete-cancel-btn" type="button" onClick={closeAll}>Cancel</button>
              <button className="delete-confirm-btn" type="button" onClick={handleDeleteUser} disabled={isSaving}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M19 6v14c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2V6M8 6V4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {isSaving ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────── PAGE CONTENT ──────── */}
      <div className="admin-user-mgmt-header">
        <h1 className="as-page-title">User Management</h1>
        <button className="add-new-user-btn" type="button" onClick={() => openEdit({ id: 'new', name: '', email: '', role: 'User', plan: 'Basic', type: 'initials', initials: '?', color: '#E9E8F4', textColor: '#5E5B73' })}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="btn-icon">
            <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H6C4.93913 15 3.92172 15.4214 3.17157 16.1716C2.42143 16.9217 2 17.9391 2 19V21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="19" y1="8" x2="19" y2="14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="16" y1="11" x2="22" y2="11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Add New User
        </button>
      </div>

      <div className="admin-user-mgmt-card">
        {error && (
          <div className="text-gray" style={{ marginBottom: '16px', color: '#dc2626' }}>
            {error}
          </div>
        )}

        <div className="admin-user-mgmt-actions">
          <div className="mgmt-search-wrapper">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="mgmt-search-icon">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <input type="text" placeholder="Search users..." className="mgmt-search-input" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <div className="mgmt-action-buttons">
            <button className="mgmt-btn-outlined" type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <line x1="4" y1="21" x2="4" y2="14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="4" y1="10" x2="4" y2="3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="12" y1="21" x2="12" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="12" y1="8" x2="12" y2="3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="20" y1="21" x2="20" y2="16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="20" y1="12" x2="20" y2="3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="2" y1="14" x2="6" y2="14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="10" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="18" y1="16" x2="22" y2="16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Filter
            </button>
            <button className="mgmt-btn-outlined" type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="7 10 12 15 17 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Export
            </button>
          </div>
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-user-table">
            <thead>
              <tr>
                <th>USER</th>
                <th>EMAIL</th>
                <th>ROLE</th>
                <th>PLAN</th>
                <th className="text-center">FOLDERS</th>
                <th className="text-center">TESTS</th>
                <th className="text-right" style={{ paddingRight: '28px' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="text-center text-gray" style={{ padding: '40px' }}>
                    Loading users from database...
                  </td>
                </tr>
              ) : paginatedUsers.length > 0 ? (
                paginatedUsers.map(user => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-profile-cell">
                        {renderAvatar(user)}
                        <span className="user-name-bold">{user.name}</span>
                      </div>
                    </td>
                    <td className="text-gray">{user.email}</td>
                    <td><span className={`role-badge role-${getBadgeKey(getUserRole(user))}`}>{getUserRole(user)}</span></td>
                    <td><span className={`plan-badge plan-${getBadgeKey(getUserPlan(user))}`}>{getUserPlan(user)}</span></td>
                    <td className="text-gray text-center font-medium">{user.folders}</td>
                    <td className="text-gray text-center font-medium">{user.tests}</td>
                    <td>
                      <div className="user-actions-cell">
                        <button className="action-btn action-view" type="button" aria-label="View" onClick={() => setViewUser(user)}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                        <button className="action-btn action-edit" type="button" aria-label="Edit" onClick={() => openEdit(user)}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l.5-5.5L17 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                        <button className="action-btn action-delete" type="button" aria-label="Delete" onClick={() => setDeleteUser(user)}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M19 6v14c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 6V4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center text-gray" style={{ padding: '40px' }}>
                    No users found matching &quot;{searchTerm}&quot;
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="admin-pagination-footer">
            <div className="pagination-controls">
              <button
                className="pagination-arrow-btn"
                type="button"
                disabled={safeCurrentPage === 1}
                aria-label="Previous Page"
                onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map(page => (
                <button
                  key={page}
                  className={`pagination-page-btn${page === safeCurrentPage ? ' active' : ''}`}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
              <button
                className="pagination-arrow-btn"
                type="button"
                disabled={safeCurrentPage === totalPages}
                aria-label="Next Page"
                onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserManagementPage;
