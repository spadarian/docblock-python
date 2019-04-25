@dataclass
class InventoryItem:
    a: str
    b: float
    c: int = 0

    z = 'TEST'

    def f(self) -> float:
        return self.b * self.c
