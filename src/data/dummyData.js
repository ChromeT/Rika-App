export const transactions = [
  { id: '1', title: 'Groceries', amount: 120, date: '2026-03-30', category: 'Food', paidBy: 'Rika', type: 'expense' },
  { id: '2', title: 'Internet Bill', amount: 60, date: '2026-03-28', category: 'Utilities', paidBy: 'Budi', type: 'expense' },
  { id: '3', title: 'Salary', amount: 3500, date: '2026-03-25', category: 'Income', paidBy: 'Rika', type: 'income' },
  { id: '4', title: 'Dining Out', amount: 45, date: '2026-03-22', category: 'Food', paidBy: 'Budi', type: 'expense' },
];

export const jointGoals = [
  { id: '1', title: 'Japan Trip 2026', currentAmount: 1500, targetAmount: 5000 },
  { id: '2', title: 'New Sofa', currentAmount: 200, targetAmount: 800 },
];

export const billReminders = [
  { id: '1', title: 'Rent Payment', dueDate: '2026-04-01', amount: 1000, responsible: 'Budi', isPaid: false },
  { id: '2', title: 'Electricity', dueDate: '2026-04-05', amount: 80, responsible: 'Rika', isPaid: false },
  { id: '3', title: 'Netflix Subscription', dueDate: '2026-04-10', amount: 15, responsible: 'Shared', isPaid: false },
];

export const userProfile = {
  name: 'Rika',
  partnerName: 'Budi',
  individualBalance: 4200,
  sharedBalance: 1700,
};
