import { UsersService } from './users.service';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { JwtService } from '../jwt/jwt.service';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CreateAccountInput } from './dtos/create-account.dto';

const mockRepository = () => ({
  findOne: jest.fn(),
  findOneOrFail: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
});
const TOKEN_VALUE = 'signed-token';
const mockJwtService = {
  sign: jest.fn(() => TOKEN_VALUE),
  verify: jest.fn(),
};

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('UsersService', () => {
  let service: UsersService;
  let jwtService: JwtService;
  let userRepository: MockRepository<User>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository(),
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    userRepository = module.get(getRepositoryToken(User));
  });
  describe('createAccount', () => {
    const createAccountArgs: CreateAccountInput = {
      email: 'test@mail.com',
      password: 'p4ssword',
      role: UserRole.Listener,
    };
    it('should create account', async () => {
      userRepository.findOne.mockResolvedValue(undefined);
      userRepository.create.mockReturnValue(createAccountArgs);
      userRepository.save.mockReturnValue({ id: 1, ...createAccountArgs });

      const result = await service.createAccount(createAccountArgs);
      expect(userRepository.findOne).toHaveBeenCalledTimes(1);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        email: createAccountArgs.email,
      });
      expect(userRepository.create).toHaveBeenCalledTimes(1);
      expect(userRepository.create).toHaveBeenCalledWith(createAccountArgs);
      expect(userRepository.save).toHaveBeenCalledTimes(1);
      expect(userRepository.save).toHaveBeenCalledWith(createAccountArgs);

      expect(result).toEqual({
        ok: true,
        error: null,
      });
    });
    it('should fail if a user exists', async () => {
      userRepository.findOne.mockResolvedValue({ id: 1 });
      const result = await service.createAccount(createAccountArgs);
      expect(userRepository.findOne).toHaveBeenCalledTimes(1);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        email: createAccountArgs.email,
      });
      expect(result).toEqual({
        ok: false,
        error: `There is a user with that email already`,
      });
    });
    it('should be fail if internal server error invoked', async () => {
      userRepository.findOne.mockRejectedValue(new Error());
      const result = await service.createAccount(createAccountArgs);

      expect(userRepository.findOne).toHaveBeenCalledTimes(1);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        email: createAccountArgs.email,
      });
      expect(result).toEqual({
        ok: false,
        error: 'Could not create account',
      });
    });
  });
  describe('login', () => {
    const loginArgs = {
      email: 'test@mail.com',
      password: 'p4ssword',
    };

    it('should login', async () => {
      const user = {
        id: 1,
        password: 'p4ssword',
        checkPassword: jest.fn(() => Promise.resolve(true)),
      };
      userRepository.findOne.mockResolvedValue(user);
      const result = await service.login(loginArgs);

      expect(userRepository.findOne).toHaveBeenCalledTimes(1);
      expect(userRepository.findOne).toHaveBeenCalledWith(
        { email: loginArgs.email },
        expect.any(Object),
      );
      expect(jwtService.sign).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        ok: true,
        token: TOKEN_VALUE,
      });
    });
    it('should fail if user is not exists', async () => {
      userRepository.findOne.mockResolvedValue(undefined);
      const result = await service.login(loginArgs);

      expect(userRepository.findOne).toHaveBeenCalledTimes(1);
      expect(userRepository.findOne).toHaveBeenCalledWith(
        { email: loginArgs.email },
        expect.any(Object),
      );

      expect(result).toEqual({ ok: false, error: 'User not found' });
    });
    it('should fail if password is incorrect', async () => {
      const user = {
        checkPassword: jest.fn(() => Promise.resolve(false)),
      };
      userRepository.findOne.mockResolvedValue(user);
      const result = await service.login(loginArgs);

      expect(userRepository.findOne).toHaveBeenCalledTimes(1);
      expect(userRepository.findOne).toHaveBeenCalledWith(
        { email: loginArgs.email },
        expect.any(Object),
      );

      expect(result).toEqual({ ok: false, error: 'Wrong password' });
    });
    it('should be fail if internal server error invoked', async () => {
      userRepository.findOne.mockRejectedValue(new Error());
      const result = await service.login(loginArgs);

      expect(userRepository.findOne).toHaveBeenCalledTimes(1);
      expect(userRepository.findOne).toHaveBeenCalledWith(
        { email: loginArgs.email },
        expect.any(Object),
      );

      expect(result).toEqual({ ok: false, error: expect.any(Error) });
    });
  });
  describe('findById', () => {
    const findByIdArgs = 1;
    const user = { id: 1 };
    it('should find a user by id', async () => {
      userRepository.findOneOrFail.mockResolvedValue(user);
      const result = await service.findById(findByIdArgs);
      expect(userRepository.findOneOrFail).toHaveBeenCalledTimes(1);
      expect(userRepository.findOneOrFail).toHaveBeenCalledWith({ id: 1 });
      expect(result).toEqual({ ok: true, user });
    });
    it('should be fail if user is not exists', async () => {
      userRepository.findOneOrFail.mockRejectedValue(new Error());
      const result = await service.findById(findByIdArgs);
      expect(userRepository.findOneOrFail).toHaveBeenCalledTimes(1);
      expect(userRepository.findOneOrFail).toHaveBeenCalledWith({ id: 1 });
      expect(result).toEqual({
        ok: false,
        error: 'User Not Found',
      });
    });
  });
  describe('editProfile', () => {
    const editProfileArgs = {
      userId: 1,
      updateValue: {},
    };
    const user = {
      email: 'test@mail.com',
      password: 'p4ssword',
    };
    it('should edit email', async () => {
      editProfileArgs.updateValue = {
        email: 'new-test@mail.com',
      };
      userRepository.findOne.mockResolvedValue(user);
      userRepository.save.mockResolvedValue({
        email: 'new-test@mail.com',
      });
      const result = await service.editProfile(
        editProfileArgs.userId,
        editProfileArgs.updateValue,
      );

      expect(userRepository.findOne).toHaveBeenCalledTimes(1);
      expect(userRepository.findOne).toHaveBeenCalledWith(
        editProfileArgs.userId,
      );
      expect(userRepository.save).toHaveBeenCalledTimes(1);
      expect(userRepository.save).toHaveBeenCalledWith({
        email: 'new-test@mail.com',
        password: 'p4ssword',
      });
      expect(result).toEqual({ ok: true });
    });

    it('should edit password', async () => {
      editProfileArgs.updateValue = {
        password: 'new-p4ssword',
      };
      userRepository.findOne.mockResolvedValue(user);
      userRepository.save.mockResolvedValue({
        email: 'test@mail.com',
        password: 'new-p4ssword',
      });
      const result = await service.editProfile(
        editProfileArgs.userId,
        editProfileArgs.updateValue,
      );

      expect(userRepository.findOne).toHaveBeenCalledTimes(1);
      expect(userRepository.findOne).toHaveBeenCalledWith(
        editProfileArgs.userId,
      );
      expect(userRepository.save).toHaveBeenCalledTimes(1);
      expect(userRepository.save).toHaveBeenCalledWith({
        email: 'new-test@mail.com',
        password: 'new-p4ssword',
      });
      expect(result).toEqual({ ok: true });
    });
    it('should be fail if internal server error invoked', async () => {
      userRepository.findOne.mockRejectedValue(new Error());
      const result = await service.editProfile(
        editProfileArgs.userId,
        editProfileArgs.updateValue,
      );
      expect(userRepository.findOne).toHaveBeenCalledTimes(1);
      expect(userRepository.findOne).toHaveBeenCalledWith(
        editProfileArgs.userId,
      );
      expect(result).toEqual({
        ok: false,
        error: 'Could not update profile',
      });
    });
  });
});
