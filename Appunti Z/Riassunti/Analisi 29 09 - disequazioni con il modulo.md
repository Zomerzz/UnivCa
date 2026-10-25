# Analisi matematica 29/09 – Disequazioni con il modulo

## <font color="#4bacc6">Come si risolve un modulo</font>
il modulo (valore assoluto) si "apre" in due casi, a seconda del segno dell'argomento
$$|f(x)| = \begin{cases} f(x) & f(x) \ge 0 \\ -f(x) & f(x) < 0 \end{cases}$$
> si scompone tutto tenendo l'argomento $\ge 0$ e $< 0$, si studia il segno sulla retta e si risolve caso per caso
---
## <font color="#4bacc6">Esercizio svolto</font>
$$|x - 3| > |x^{2} + 3x + 2|$$
**primo modulo**
$$|x-3| = \begin{cases} x - 3 & x \ge 3 \\ 3 - x & x < 3 \end{cases}$$
**secondo modulo**: radici di $x^{2}+3x+2$ (con $a \cdot b = c$, $a + b = $ coefficiente di x) → $x = -1, \ x = -2$
$$|x^{2}+3x+2| = \begin{cases} x^{2}+3x+2 & x \le -2 \ \vee \ x \ge -1 \\ -(x^{2}+3x+2) & -2 < x < -1 \end{cases}$$
sulla retta si ottengono gli intervalli separati da $-2, \ -1, \ 3$, e in ogni intervallo si risolve la disequazione senza moduli, ad esempio per $x \ge 3$:
$$x - 3 > x^{2} + 3x + 2$$
> scorciatoia: con due moduli ai due lati, posso elevare al quadrato (tutti e due i lati sono $\ge 0$)
$$(x-3)^{2} > (x^{2}+3x+2)^{2} \iff (x^{2}+2x+5)(x^{2}+4x-1) < 0$$
$x^{2}+2x+5 > 0$ sempre, quindi resta $x^{2}+4x-1<0$, con $\Delta$: $\sqrt{16+4} = \sqrt{20} = 2\sqrt{5}$
$$\boxed{-2-\sqrt{5} < x < -2+\sqrt{5}}$$
> $\sqrt{20} = \sqrt{4 \cdot 5} = 2\sqrt{5}$: si porta fuori dalla radice il quadrato
