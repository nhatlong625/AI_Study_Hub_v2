export function mergeLibraryCourses(courses = []) {
  const merged = new Map();

  courses.forEach(course => {
    const code = String(course.code || course.name || '').trim();
    if (!code) return;
    const key = code.toLowerCase();
    const subjectId = Number(course.subjectId ?? course.id);
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, {
        ...course,
        subjectIds: Number.isFinite(subjectId) ? [subjectId] : [],
        documentCount: Number(course.documentCount || 0),
        documents: Array.isArray(course.documents) ? course.documents : []
      });
      return;
    }

    const subjectIds = Number.isFinite(subjectId)
      ? [...new Set([...(existing.subjectIds || []), subjectId])]
      : existing.subjectIds || [];
    merged.set(key, {
      ...existing,
      name: existing.name?.length >= (course.name || '').length ? existing.name : course.name,
      subjectIds,
      documentCount: Number(existing.documentCount || 0) + Number(course.documentCount || 0),
      documents: [
        ...(Array.isArray(existing.documents) ? existing.documents : []),
        ...(Array.isArray(course.documents) ? course.documents : [])
      ]
    });
  });

  return [...merged.values()];
}
