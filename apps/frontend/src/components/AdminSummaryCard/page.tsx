import React from 'react'

interface AdminSummaryCardProps {
  title: string
  value: number | string
  icon: React.ReactNode
}

const AdminSummaryCard: React.FC<AdminSummaryCardProps> = ({ title, value, icon }) => {
  return (
    <div className="bg-white p-5 rounded-xl shadow-md flex items-center space-x-4 w-full">
      <div className="text-3xl">{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  )
}

export default AdminSummaryCard
