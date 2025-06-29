export type LevelType = 'personal' | 'family' | 'circle';

export interface LevelInfo {
  type: LevelType;
  name: string;
  displayName: string;
  icon: string;
  id?: number;
  title?: string;
}

export interface PersonalLevel extends LevelInfo {
  type: 'personal';
  name: 'personal';
  displayName: 'Личное пространство';
  icon: '/img/icons/private_icon.png';
  title?: string; // Имя Фамилия пользователя
}

export interface FamilyLevel extends LevelInfo {
  type: 'family';
  name: 'family';
  displayName: 'Пространство семьи';
  icon: '/img/icons/nucfamily_icon.png';
  id: number;
  title: string; // Название семьи
  userRole?: string; // Роль пользователя в семье
  isAdmin?: boolean; // Является ли пользователь админом
  canJoinCircles?: boolean; // Может ли присоединять семью к кругам
  canShareToCircles?: boolean; // Может ли делиться данными с кругом
  canManageCircleAccess?: boolean; // Может ли управлять доступом семьи к кругу
}

export interface CircleLevel extends LevelInfo {
  type: 'circle';
  name: 'circle';
  displayName: 'Семейный круг';
  icon: '/img/icons/famcirclle_icon.png';
  id: number;
  title: string; // Название круга
  userRole?: string; // Роль пользователя в круге
  isAdmin?: boolean; // Является ли пользователь админом
  familyId: number; // ID семьи, через которую пользователь состоит в круге
  familyTitle?: string; // Название семьи
}

export type Level = PersonalLevel | FamilyLevel | CircleLevel;

export interface JoinFormData {
  join_code: string;
  join_password: string;
}

export interface CreateFamilyData {
  name: string;
  description?: string;
}

export interface CreateCircleData {
  name: string;
  description?: string;
} 