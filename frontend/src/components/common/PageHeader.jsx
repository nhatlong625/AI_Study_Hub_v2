function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="flex min-h-[64px] items-start justify-between gap-4 mb-6">
      <div className="min-w-0">
        {eyebrow && (
          <span className="inline-block px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg mb-2">
            {eyebrow}
          </span>
        )}
        <h1 className="m-0 text-[30px] leading-9 font-black text-gray-900 tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-1 mb-0 text-sm leading-5 text-gray-500">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
export default PageHeader;
