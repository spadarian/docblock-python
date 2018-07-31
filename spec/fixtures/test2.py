class Test:

    zzz = 'TEST'

    def __init__(self, a):
        self.a = a
        self.b = a + 1

    def f(self, c: int = 1) -> int:
        first = c * self.b

        def pow(n, p):
            return n ** p

        return pow(first, 2)
