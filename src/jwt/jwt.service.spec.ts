import { JwtService } from './jwt.service';
import { Test } from '@nestjs/testing';
import { CONFIG_OPTIONS } from './jwt.constants';
import { JwtModuleOptions } from './jwt.interfaces';

const TEST_KEY = 'test-key';
jest.mock('jsonwebtoken', () => {
  return {
    sign: jest.fn(
      ({ id }, privateKey) =>
        'SIGNED_TOKEN_WITH ' + privateKey + ' ' + 'id: ' + id.toString(),
    ),
    verify: jest.fn((token, privateKey) => ({
      id: Number(token.split(' ')[3]),
    })),
  };
});

describe('JwtService', () => {
  let service: JwtService;
  let options: JwtModuleOptions;
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        JwtService,
        {
          provide: CONFIG_OPTIONS,
          useValue: { privateKey: TEST_KEY },
        },
      ],
    }).compile();

    service = module.get<JwtService>(JwtService);
    options = module.get(CONFIG_OPTIONS);
  });
  const signArgs = 1;
  let token: string;
  describe('sign', () => {
    it('should sign id', async () => {
      token = service.sign(signArgs);
      expect(token).toEqual(
        'SIGNED_TOKEN_WITH ' +
          options.privateKey +
          ' ' +
          'id: ' +
          signArgs.toString(),
      );
    });
  });
  describe('verify', () => {
    it('should verify token', async () => {
      const result = service.verify(token);
      expect(result).toEqual({ id: signArgs });
    });
  });
});
