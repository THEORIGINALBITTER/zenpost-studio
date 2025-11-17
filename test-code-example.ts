/**
 * Beispiel TypeScript Code für Code-zu-README Test
 */

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

interface UserRepository {
  findById(id: string): Promise<User | null>;
  create(user: Omit<User, 'id'>): Promise<User>;
  update(id: string, user: Partial<User>): Promise<User>;
  delete(id: string): Promise<void>;
}

/**
 * In-Memory Implementation des UserRepository
 */
export class InMemoryUserRepository implements UserRepository {
  private users: Map<string, User> = new Map();

  /**
   * Findet einen User anhand seiner ID
   * @param id - Die User-ID
   * @returns Der gefundene User oder null
   */
  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  /**
   * Erstellt einen neuen User
   * @param userData - User-Daten ohne ID
   * @returns Der erstellte User mit ID
   */
  async create(userData: Omit<User, 'id'>): Promise<User> {
    const id = this.generateId();
    const user: User = {
      id,
      ...userData,
    };
    this.users.set(id, user);
    return user;
  }

  /**
   * Aktualisiert einen existierenden User
   * @param id - Die User-ID
   * @param userData - Die zu aktualisierenden Felder
   * @returns Der aktualisierte User
   */
  async update(id: string, userData: Partial<User>): Promise<User> {
    const existingUser = await this.findById(id);
    if (!existingUser) {
      throw new Error(`User with id ${id} not found`);
    }
    const updatedUser = { ...existingUser, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  /**
   * Löscht einen User
   * @param id - Die User-ID
   */
  async delete(id: string): Promise<void> {
    this.users.delete(id);
  }

  /**
   * Generiert eine eindeutige ID
   * @returns Eine neue UUID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Beispiel-Verwendung
async function example() {
  const userRepo = new InMemoryUserRepository();

  // Neuen User erstellen
  const newUser = await userRepo.create({
    name: 'Max Mustermann',
    email: 'max@example.com',
    createdAt: new Date(),
  });

  console.log('Created user:', newUser);

  // User aktualisieren
  const updatedUser = await userRepo.update(newUser.id, {
    email: 'max.mustermann@example.com',
  });

  console.log('Updated user:', updatedUser);

  // User finden
  const foundUser = await userRepo.findById(newUser.id);
  console.log('Found user:', foundUser);

  // User löschen
  await userRepo.delete(newUser.id);
  console.log('User deleted');
}
