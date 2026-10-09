import { DEFAULT_QUERY, parseOrderQuery, serializeOrderQuery } from './orderQuery';

const parse = (s: string) => parseOrderQuery(new URLSearchParams(s));

describe('order query URL format', () => {
  it('uses defaults for an empty URL', () => {
    expect(parse('')).toEqual(DEFAULT_QUERY);
    expect(DEFAULT_QUERY).toMatchObject({
      q: '',
      sort: 'createdAt',
      dir: 'desc',
      page: 1,
      pageSize: 100,
    });
  });

  it('parses a full query', () => {
    expect(
      parse(
        'q=smith&status=shipped,pending&country=DE&payment=card&minTotal=10&maxTotal=99.5' +
          '&from=2025-01-01&to=2025-02-01&sort=totalCents&dir=asc&page=3&pageSize=250',
      ),
    ).toEqual({
      q: 'smith',
      status: ['shipped', 'pending'],
      country: ['DE'],
      payment: ['card'],
      minTotal: 10,
      maxTotal: 99.5,
      from: '2025-01-01',
      to: '2025-02-01',
      sort: 'totalCents',
      dir: 'asc',
      page: 3,
      pageSize: 250,
    });
  });

  it('falls back per field instead of rejecting a bad link', () => {
    const q = parse(
      'status=shipped,bogus,shipped&sort=hack&dir=up&page=-4&pageSize=7' +
        '&minTotal=abc&maxTotal=&from=2025-13-40',
    );
    expect(q.status).toEqual(['shipped']);
    expect(q.sort).toBe('createdAt');
    expect(q.dir).toBe('desc');
    expect(q.page).toBe(1);
    expect(q.pageSize).toBe(100);
    expect(q.minTotal).toBeUndefined();
    expect(q.maxTotal).toBeUndefined();
    expect(q.from).toBeUndefined();
  });

  it('serialises canonically: defaults omitted, multi-values sorted', () => {
    expect(serializeOrderQuery(DEFAULT_QUERY).toString()).toBe('');
    const a = serializeOrderQuery({ ...DEFAULT_QUERY, status: ['shipped', 'pending'], page: 2 });
    const b = serializeOrderQuery({ ...DEFAULT_QUERY, page: 2, status: ['pending', 'shipped'] });
    expect(a.toString()).toBe(b.toString());
    expect(a.toString()).toBe('status=pending%2Cshipped&page=2');
  });

  it('round-trips: parse(serialize(q)) equals q', () => {
    const q = parse('q=ab&country=JP,US&minTotal=0&sort=id&dir=asc&page=9&pageSize=1000');
    expect(parseOrderQuery(serializeOrderQuery(q))).toEqual(q);
  });
});
