"use client";

interface TableBlockProps {
  title?: string;
  headers: string[];
  rows: string[][];
}

export default function TableBlock({ title, headers, rows }: TableBlockProps) {
  return (
    <section className="space-y-4">
      {title ? (
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-zinc-500">
          {title}
        </p>
      ) : null}
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50">
        <table className="min-w-full divide-y divide-zinc-800">
          <thead className="bg-zinc-800/50">
            <tr>
              {headers.map((header) => (
                <th
                  className="px-4 py-3 text-left text-sm font-semibold tracking-[0.08em] text-zinc-100"
                  key={header}
                  scope="col"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                className="border-t border-zinc-800 transition hover:bg-zinc-800/30"
                key={`${rowIndex}-${row.join("-")}`}
              >
                {row.map((cell, cellIndex) => (
                  <td
                    className="px-4 py-3 text-sm text-zinc-300"
                    key={`${rowIndex}-${cellIndex}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
