function Table({ columns, data, renderRow }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key || column}>{column.label || column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => renderRow(row))}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
