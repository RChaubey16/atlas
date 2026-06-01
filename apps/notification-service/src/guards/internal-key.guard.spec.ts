import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { InternalKeyGuard } from './internal-key.guard';

function makeContext(key: string | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: key !== undefined ? { 'x-internal-key': key } : {},
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('InternalKeyGuard', () => {
  let guard: InternalKeyGuard;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        InternalKeyGuard,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('secret-key'),
          },
        },
      ],
    }).compile();

    guard = module.get<InternalKeyGuard>(InternalKeyGuard);
  });

  it('returns true when the x-internal-key header matches', () => {
    expect(guard.canActivate(makeContext('secret-key'))).toBe(true);
  });

  it('throws UnauthorizedException when the key is wrong', () => {
    expect(() => guard.canActivate(makeContext('wrong-key'))).toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException when the header is missing', () => {
    expect(() => guard.canActivate(makeContext(undefined))).toThrow(
      UnauthorizedException,
    );
  });
});
