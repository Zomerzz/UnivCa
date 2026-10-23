# Fisica 08/10 – Moto circolare uniforme e moto relativo

## <font color="#4bacc6">Moto circolare uniforme</font>
raggio costante, il modulo della velocità è costante, cambia solo la direzione
| grandezza | definizione | formula |
|---|---|---|
| velocità angolare | angolo percorso nel tempo | $\omega = \frac{\Delta\theta}{\Delta t}$ |
| periodo | tempo per un giro completo | $T = \frac{2\pi}{\omega}$ |
| frequenza | giri in un secondo | $f = \frac{1}{T} = \frac{\omega}{2\pi} \ [Hz]$ |
| legge oraria | | $\theta(t) = \theta_{0} + \omega t$ |
| arco | | $s = r\theta$ |
| velocità tangenziale | | $v = \omega r = \frac{2\pi r}{T}$ |
| accelerazione centripeta | verso il centro | $a_{c} = \frac{v^{2}}{r} = \omega^{2}r$ |
---
## <font color="#4bacc6">Dimostrazione con i vettori</font>
$$\vec{r} = x_{p}\hat{i} + y_{p}\hat{j} = r\left[\cos(\omega t)\hat{i} + \sin(\omega t)\hat{j}\right]$$
$$\vec{v}(t) = \frac{d\vec{r}}{dt} = r\left(-\omega\sin\omega t\,\hat{i} + \omega\cos\omega t\,\hat{j}\right) \qquad v_{x} = -\omega r\sin\omega t, \quad v_{y} = \omega r\cos\omega t$$
$$\vec{a} = \frac{d\vec{v}}{dt} = \omega r\left(-\omega\cos\omega t\,\hat{i} - \omega\sin\omega t\,\hat{j}\right) = -\omega^{2}r\left(\cos\omega t\,\hat{i} + \sin\omega t\,\hat{j}\right) = -\omega^{2}\vec{r}$$
> l'accelerazione è opposta a $\vec{r}$: punta sempre verso il centro (centripeta)
---
## <font color="#4bacc6">Es. – il giro della morte</font>
quanto deve andare veloce un carrello per fare il giro senza staccarsi? In cima serve $a_{c} \ge g$:
$$a_{c} = \frac{v^{2}}{r} \ge g \ \Rightarrow \ v \ge \sqrt{gr}$$
---
## <font color="#4bacc6">Moto relativo</font>
la posizione di un punto P in un sistema A si ottiene dalla posizione nel sistema B più la posizione di B rispetto ad A:
$$x_{PA} = x_{PB} + x_{BA} \qquad v_{PA} = v_{PB} + v_{BA}$$
---
## <font color="#4bacc6">Es. – il treno e la locomotiva</font>
una locomotiva va a 30 km/h; 600 m dietro, sullo stesso binario, un treno va a 160 km/h nella stessa direzione. Quale decelerazione minima evita lo scontro?
$$160 \ \tfrac{km}{h} = 44{,}4 \ \tfrac{m}{s} \qquad 30 \ \tfrac{km}{h} = 8{,}3 \ \tfrac{m}{s} \qquad v_{rel} = 36{,}1 \ \tfrac{m}{s}$$
nel sistema della locomotiva il treno deve arrivare a velocità relativa 0 in 600 m:
$$0 = v_{rel}^{2} - 2a \cdot 600 \ \Rightarrow \ a = \frac{(44{,}4 - 8{,}3)^{2}}{1200} \approx 1{,}1 \ m/s^{2}$$
> mettendosi nel sistema di riferimento della locomotiva, il problema diventa una semplice frenata
