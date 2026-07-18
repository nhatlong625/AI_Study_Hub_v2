import Button from '../../common/Button';

function ContextSelectorModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'var(--surface)', borderRadius: '8px', width: '500px', maxWidth: '90vw', padding: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0 }}>Select Context</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }}>&times;</button>
        </div>
        
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.9rem' }}>
          Choose documents or courses for the AI to reference during this chat.
        </p>

        <div style={{ border: '1px solid var(--border)', borderRadius: '4px', padding: '16px', marginBottom: '24px', height: '200px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <input type="checkbox" id="doc1" />
            <label htmlFor="doc1">OOP Chapter 2.pdf</label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <input type="checkbox" id="doc2" />
            <label htmlFor="doc2">Data Structures Notes.docx</label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0' }}>
            <input type="checkbox" id="doc3" />
            <label htmlFor="doc3">Intro to Algorithms Lecture</label>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={onClose}>Confirm Context</Button>
        </div>
      </div>
    </div>
  );
}

export default ContextSelectorModal;
