import qrcode
from PIL import Image, ImageDraw, ImageFont
import random

def genera_qr_con_seriale(dati, numero_seriale=None, nome_file="qr_code.png"):
    """
    Genera un QR code con numero seriale sotto.
    
    Args:
        dati: I dati da codificare nel QR code (URL, testo, ecc.)
        numero_seriale: Numero seriale a 7 cifre (opzionale, viene generato se non fornito)
        nome_file: Nome del file di output
    """
    
    # Genera numero seriale casuale se non fornito
    if numero_seriale is None:
        numero_seriale = random.randint(1000000, 9999999)
    else:
        # Assicura che sia a 7 cifre
        numero_seriale = int(numero_seriale)
        if numero_seriale < 1000000 or numero_seriale > 9999999:
            numero_seriale = random.randint(1000000, 9999999)
    
    # Crea il QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(dati)
    qr.make(fit=True)
    
    # Genera l'immagine del QR code
    img_qr = qr.make_image(fill_color="black", back_color="white")
    
    # Converti in RGB se necessario
    img_qr = img_qr.convert('RGB')
    
    # Dimensioni del QR code
    qr_width, qr_height = img_qr.size
    
    # Crea una nuova immagine più grande per includere il numero seriale
    spazio_testo = 60  # Spazio per il testo sotto
    img_finale = Image.new('RGB', (qr_width, qr_height + spazio_testo), 'white')
    
    # Incolla il QR code in alto
    img_finale.paste(img_qr, (0, 0))
    
    # Aggiungi il numero seriale sotto
    draw = ImageDraw.Draw(img_finale)
    
    # Usa un font predefinito o carica un font personalizzato
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 32)
    except:
        try:
            font = ImageFont.truetype("arial.ttf", 32)
        except:
            font = ImageFont.load_default()
    
    # Testo del numero seriale
    testo_seriale = f"#{numero_seriale:07d}"
    
    # Calcola la posizione centrata del testo
    bbox = draw.textbbox((0, 0), testo_seriale, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    posizione_x = (qr_width - text_width) // 2
    posizione_y = qr_height + (spazio_testo - text_height) // 2
    
    # Disegna il testo
    draw.text((posizione_x, posizione_y), testo_seriale, fill='black', font=font)
    
    # Salva l'immagine
    img_finale.save(nome_file)
    print(f"QR code generato: {nome_file}")
    print(f"Numero seriale: {numero_seriale}")
    
    return numero_seriale

# Esempio di utilizzo
if __name__ == "__main__":
    # Genera un singolo QR code
    dati = "https://www.esempio.com"
    genera_qr_con_seriale(dati, nome_file="qr_esempio.png")
    
    # Genera multipli QR code con numeri seriali sequenziali
    print("\nGenerazione multipla:")
    for i in range(3):
        numero = 1000000 + i
        dati = f"https://www.esempio.com/prodotto/{numero}"
        genera_qr_con_seriale(dati, numero, f"qr_prodotto_{numero}.png")