import { ResponsiveTable, type Column } from './ResponsiveTable';
import { Badge } from './badge';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
}

const columns: Column<User>[] = [
  {
    key: 'name',
    header: 'Name',
    render: (user) => user.name,
    isTitle: true,
    showOnMobile: true,
  },
  {
    key: 'email',
    header: 'Email',
    render: (user) => user.email,
    showOnMobile: true,
  },
  {
    key: 'role',
    header: 'Role',
    render: (user) => user.role,
    showOnMobile: true,
  },
  {
    key: 'status',
    header: 'Status',
    render: (user) => (
      <Badge variant={user.status === 'active' ? 'success' : 'secondary'}>
        {user.status}
      </Badge>
    ),
    showOnMobile: true,
  },
];

export function UserTableExample() {
  const users: User[] = [
    { id: '1', name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'active' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'User', status: 'inactive' },
  ];
  
  return (
    <ResponsiveTable
      data={users}
      columns={columns}
      getKey={(user) => user.id}
      onRowClick={(user) => console.log('Clicked:', user)}
    />
  );
}
