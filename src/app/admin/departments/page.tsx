import React from 'react';
import { db } from '@/lib/db';
import DepartmentsClient from './DepartmentsClient';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { hasPermission } from '@/lib/permissions';

export const metadata = {
  title: 'Departments | Hamdard AI Platform',
};

export default async function DepartmentsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const allowed = await hasPermission(session.user.id, "departments.view");
  if (!allowed) {
    redirect('/admin');
  }

  // Fetch initial data on the server
  const departments = await db.department.findMany({
    include: {
      headOfDepartment: { select: { id: true, name: true, email: true } },
      _count: { select: { teams: true, employees: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const employees = await db.employee.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  });

  // Next.js 16 requires serializing data across server/client boundary
  const serializedDepts = JSON.parse(JSON.stringify(departments));

  return (
    <DepartmentsClient 
      initialDepartments={serializedDepts} 
      employees={employees} 
    />
  );
}
