'use client'

import { useEffect } from 'react'

type TimelineEntry = {
  date: string
  time: string
  label: string
}

type TrackingHistoryProps = {
  timeline: {
    date: string
    entries: { time: string; label: string }[]
  }[]
  onViewRoute: () => void
  onDownloadReport: () => void
}

export default function TrackingHistory({
  timeline,
  onViewRoute,
  onDownloadReport,
}: TrackingHistoryProps) {
  useEffect(() => {
    console.log('[TrackingHistory.tsx] Received timeline:', timeline)
  }, [timeline])

  return (
    <div className="bg-white p-5 rounded-lg shadow">
      <h2 className="font-semibold text-lg mb-3">Tracking History</h2>

      {/* 👀 Debug Preview - remove in production */}
      <div className="mb-4">
        <h3 className="text-xs text-gray-400 mb-1">[DEBUG] Timeline Raw Output:</h3>
        <pre className="bg-gray-100 text-xs p-2 rounded overflow-x-auto">
          {JSON.stringify(timeline, null, 2)}
        </pre>
      </div>

      {timeline.length > 0 ? (
        <div className="space-y-4">
          {timeline.map((group, index) => (
            <div key={index} className="space-y-2">
              <p className="text-sm font-semibold text-gray-600">{group.date}</p>
              {group.entries.map((entry, idx) => (
                <div key={idx} className="flex items-start gap-4 ml-4">
                  <div className="w-24 text-xs text-gray-500">{entry.time}</div>
                  <div className="w-2 h-2 mt-2 bg-orange-500 rounded-full" />
                  <div className="text-sm text-gray-800">{entry.label}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <p className="italic text-gray-500">No tracking updates available.</p>
      )}

      {/* Action Buttons */}
      <div className="mt-6 flex gap-3">
        <button
          onClick={onViewRoute}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          📍 View Route
        </button>
        <button
          onClick={onDownloadReport}
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
        >
          📄 Download Report
        </button>
      </div>
    </div>
  )
}
