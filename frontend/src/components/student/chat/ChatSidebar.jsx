import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

function ChatSidebar({ threads, citedSources, onSourceClick, onNewChat, onThreadSelect, onDeleteThread, recentError, variant = 'sources', showCourseFolders = false, courseFolder }) {
  const [expandedFolders, setExpandedFolders] = useState({ SWR: true });
  const [openThreadMenuId, setOpenThreadMenuId] = useState(null);
  const location = useLocation();
  const folderName = courseFolder?.name || 'SWR';
  const folderFiles = courseFolder?.files || [];
  const sourceLabel = (source) => (
    typeof source === 'string'
      ? source
      : source?.documentName || source?.document_name || source?.title || 'Source document'
  );
  
  const toggleFolder = (folderName) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderName]: !prev[folderName]
    }));
  };

  return (
    <aside className={`chat-sidebar ${variant === 'newChat' && !showCourseFolders ? 'hide-source-section' : ''}`} style={{ width: '280px', borderRight: '1px solid #eaeaea', display: 'flex', flexDirection: 'column', height: '100%', background: '#ffffff', flexShrink: 0 }}>
      <div style={{ padding: '24px 20px 16px' }}>
        <NavLink to="/student/ai-tutor" style={{ textDecoration: 'none' }} onClick={onNewChat}>
          <button style={{ 
            width: '100%', 
            background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
            color: 'white', 
            border: 'none', 
            borderRadius: '16px', 
            padding: '14px', 
            fontSize: '1rem', 
            fontWeight: '600', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            position: 'relative',
            cursor: 'pointer',
            boxShadow: '0 8px 20px -6px rgba(124, 58, 237, 0.5)',
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 12px 24px -8px rgba(124, 58, 237, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 20px -6px rgba(124, 58, 237, 0.5)';
          }}
          >
            <div style={{ position: 'absolute', left: '16px', display: 'flex', alignItems: 'center' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </div>
            New Chat
          </button>
        </NavLink>
        
        <div style={{ position: 'relative', marginTop: '16px' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '12px', top: '10px' }}>
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input 
            type="text" 
            placeholder="Search chats" 
            style={{ 
              width: '100%', 
              background: '#f3f2fb', 
              border: 'none', 
              borderRadius: '8px', 
              padding: '10px 10px 10px 36px', 
              fontSize: '0.9rem', 
              color: '#333',
              outline: 'none'
            }} 
          />
        </div>
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
        <div className="chat-sidebar-section-header">
          <h4 className="chat-sidebar-section-title">
            {showCourseFolders && folderFiles.length > 0 ? 'COURSE FOLDERS' : 'CITED SOURCES'}
          </h4>
          <svg className="chat-sidebar-section-action" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </div>
        
        <div className="sidebar-menu admin-sidebar-menu chat-sidebar-menu-block">
          {showCourseFolders && folderFiles.length > 0 ? (
            <>
              <button
                type="button"
                onClick={() => toggleFolder(folderName)}
                className="sidebar-link admin-sidebar-link chat-folder-row"
              >
                <span className={`chat-folder-chevron ${expandedFolders[folderName] ? 'is-open' : ''}`}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 18l6-6-6-6"></path>
                  </svg>
                </span>
                <span className="sidebar-icon admin-sidebar-icon chat-folder-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7l-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"></path>
                  </svg>
                </span>
                <span>{folderName}</span>
              </button>
              {expandedFolders[folderName] && (
                <div className="chat-folder-files">
                  {folderFiles.map(file => (
                    <button
                      type="button"
                      key={file}
                      title={file}
                      className="chat-folder-file"
                      onClick={() => onSourceClick?.({ source: file })}
                    >
                      {file}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : citedSources && citedSources.length > 0 ? (
            citedSources.map((item, idx) => (
              <div 
                key={idx}
                className="sidebar-link admin-sidebar-link chat-source-row" 
                onClick={() => onSourceClick && onSourceClick(item)}
                title={sourceLabel(item.source)}
              >
                <span className="sidebar-icon admin-sidebar-icon chat-source-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                </span>
                <span
                  className="admin-sidebar-label chat-source-label"
                >
                  {sourceLabel(item.source)}
                </span>
              </div>
            ))
          ) : (
            <div className="chat-sidebar-empty">No sources cited yet</div>
          )}
        </div>


        <h4 style={{ fontSize: '10px', fontWeight: '700', color: '#888', letterSpacing: '0.5px', marginBottom: '8px' }}>RECENT</h4>
        <div className="sidebar-menu admin-sidebar-menu">
          {recentError ? (
            <div style={{ color: '#dc2626', fontSize: '12px', lineHeight: 1.45, padding: '8px 4px' }}>
              Cannot load recent chats from backend.
            </div>
          ) : threads && threads.length > 0 ? threads.map((thread, idx) => {
            const threadMenuId = thread.id || `thread-${idx}`;
            const isThreadMenuOpen = openThreadMenuId === threadMenuId;
            const threadPath = thread.href || `/student/ai-tutor/chat/${thread.id}`;
            const isActiveThread = location.pathname === threadPath;

            return (
              <div key={threadMenuId} style={{ position: 'relative' }}>
                <NavLink 
                  to={threadPath} 
                  className={({ isActive }) => ['sidebar-link', 'admin-sidebar-link', isActive ? 'active' : ''].join(' ').trim()}
                  style={{ position: 'relative', paddingRight: onDeleteThread ? '38px' : '12px' }}
                  onClick={() => {
                    setOpenThreadMenuId(null);
                    onThreadSelect?.(thread);
                  }}
                >
                  <span className="sidebar-icon admin-sidebar-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                  </span>
                  <span className="admin-sidebar-label" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: onDeleteThread ? '126px' : '160px' }}>{thread.title}</span>
                  <div className="custom-tooltip">{thread.title}</div>
                </NavLink>
                {onDeleteThread && (
                  <>
                    <button
                      type="button"
                      title={`More options for ${thread.title}`}
                      aria-label={`More options for ${thread.title}`}
                      aria-haspopup="menu"
                      aria-expanded={isThreadMenuOpen}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setOpenThreadMenuId(isThreadMenuOpen ? null : threadMenuId);
                      }}
                      style={{
                        position: 'absolute',
                        top: '50%',
                        right: '8px',
                        transform: 'translateY(-50%)',
                        width: '24px',
                        height: '24px',
                        border: 'none',
                        borderRadius: '6px',
                        background: isThreadMenuOpen ? (isActiveThread ? 'rgba(255, 255, 255, 0.16)' : '#f4f0ff') : 'transparent',
                        color: isActiveThread ? 'rgba(255, 255, 255, 0.86)' : '#8a8796',
                        display: 'grid',
                        placeItems: 'center',
                        cursor: 'pointer',
                        opacity: isThreadMenuOpen ? 1 : 0.72
                      }}
                      onMouseEnter={(event) => {
                        event.currentTarget.style.background = isActiveThread ? 'rgba(255, 255, 255, 0.16)' : '#f4f0ff';
                        event.currentTarget.style.color = isActiveThread ? '#ffffff' : '#5046e5';
                        event.currentTarget.style.opacity = '1';
                      }}
                      onMouseLeave={(event) => {
                        event.currentTarget.style.background = isThreadMenuOpen ? (isActiveThread ? 'rgba(255, 255, 255, 0.16)' : '#f4f0ff') : 'transparent';
                        event.currentTarget.style.color = isActiveThread ? 'rgba(255, 255, 255, 0.86)' : '#8a8796';
                        event.currentTarget.style.opacity = isThreadMenuOpen ? '1' : '0.72';
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="19" cy="12" r="1"></circle>
                        <circle cx="5" cy="12" r="1"></circle>
                      </svg>
                    </button>
                    {isThreadMenuOpen && (
                      <div
                        role="menu"
                        style={{
                          position: 'absolute',
                          top: '34px',
                          right: '6px',
                          minWidth: '126px',
                          background: '#ffffff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '10px',
                          boxShadow: '0 14px 30px rgba(15, 23, 42, 0.14)',
                          padding: '6px',
                          zIndex: 30
                        }}
                      >
                        <button
                          type="button"
                          role="menuitem"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setOpenThreadMenuId(null);
                            onDeleteThread(thread);
                          }}
                          style={{
                            width: '100%',
                            border: 'none',
                            borderRadius: '8px',
                            background: 'transparent',
                            color: '#dc2626',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '9px 10px',
                            fontSize: '13px',
                            fontWeight: 700,
                            textAlign: 'left'
                          }}
                          onMouseEnter={(event) => {
                            event.currentTarget.style.background = '#fee2e2';
                          }}
                          onMouseLeave={(event) => {
                            event.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"></path>
                            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                          </svg>
                          Delete
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          }) : (
            <div className="chat-sidebar-empty">No saved chats yet</div>
          )}
          {!threads && (
            <>
              <div className="sidebar-link admin-sidebar-link" style={{ cursor: 'pointer', position: 'relative' }}>
                <span className="sidebar-icon admin-sidebar-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                </span>
                <span className="admin-sidebar-label" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>Calculus III: Chain Rule</span>
                <div className="custom-tooltip">Calculus III: Chain Rule</div>
              </div>
              <div className="sidebar-link admin-sidebar-link" style={{ cursor: 'pointer', position: 'relative' }}>
                <span className="sidebar-icon admin-sidebar-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                </span>
                <span className="admin-sidebar-label" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>ATP Synthesis Steps</span>
                <div className="custom-tooltip">ATP Synthesis Steps</div>
              </div>
              <div className="sidebar-link admin-sidebar-link" style={{ cursor: 'pointer', position: 'relative' }}>
                <span className="sidebar-icon admin-sidebar-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                </span>
                <span className="admin-sidebar-label" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>Supply and Demand Cu...</span>
                <div className="custom-tooltip">Supply and Demand Curve</div>
              </div>
              <div className="sidebar-link admin-sidebar-link" style={{ cursor: 'pointer', position: 'relative' }}>
                <span className="sidebar-icon admin-sidebar-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                </span>
                <span className="admin-sidebar-label" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>Python Loops Exercise</span>
                <div className="custom-tooltip">BÃ i táº­p vÃ²ng láº·p Python</div>
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ padding: '16px 20px', borderTop: '1px solid #eaeaea', textAlign: 'center' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#8b5cf6', letterSpacing: '1px' }}>POWERED BY STUDYFLOW AI</span>
      </div>
    </aside>
  );
}

export default ChatSidebar;
