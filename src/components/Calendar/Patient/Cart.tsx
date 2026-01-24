import { useState } from "react";
import type { Appointment } from "../../../interfaces/interfaces";
import { format, parseISO } from "date-fns";

interface CartProps {
  appointments: Appointment[] | undefined;
  onPay: (appointmentIds: Appointment[]) => Promise<boolean>;
  onCancel: (appointmentId: string) => Promise<void>; 
}

const Cart = ({ appointments, onPay, onCancel }: CartProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const totalCost = appointments?.reduce((sum, app) => sum + (app.cost || 0), 0);

  const handlePayment = async () => {
    setIsProcessing(true);
    
    setTimeout(async () => {
      let isSuccess = false;

      if(appointments)
        isSuccess = await onPay(appointments);
      
      setIsProcessing(false);
      setPaymentSuccess(isSuccess);
      
      setTimeout(() => setPaymentSuccess(false), 3000);
    }, 2000);
  };

  if (appointments?.length === 0 && !paymentSuccess) {
    return (
      <div className="card mb-4">
        <div className="card-header bg-light">Twój Koszyk</div>
        <div className="card-body text-center text-muted">
          Koszyk jest pusty. Zarezerwuj wizytę w kalendarzu.
        </div>
      </div>
    );
  }

  return (
    <div className="card mb-4 shadow-sm">
      <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Koszyk Usług</h5>
        <span className="badge bg-light text-primary">{appointments?.length} wizyt</span>
      </div>
      
      <div className="card-body p-0">
        {paymentSuccess ? (
          <div className="alert alert-success m-3" role="alert">
            <h4 className="alert-heading">Płatność udana!</h4>
            <p>Twoje wizyty zostały potwierdzone.</p>
          </div>
        ) : (
          <ul className="list-group list-group-flush">
            {appointments?.map((app) => (
              <li key={app.id} className="list-group-item">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <strong>Wizyta lekarska</strong>
                    <div className="small text-muted">
                      {format(parseISO(app.startTime), "yyyy-MM-dd HH:mm")} ({app.durationMinutes} min)
                    </div>
                  </div>
                  <span className="fw-bold text-nowrap ms-2">{app.cost} PLN</span>
                </div>
                
                <div className="mt-2 d-flex justify-content-end">
                   <button 
                     className="btn btn-outline-danger btn-sm py-0"
                     onClick={() => onCancel(app.id)}
                     disabled={isProcessing}
                     title="Usuń z koszyka"
                   >
                     &times; Usuń
                   </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!paymentSuccess && appointments && appointments.length > 0 && (
        <div className="card-footer bg-white">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <span className="h5 mb-0">Suma:</span>
            <span className="h4 mb-0 text-primary">{totalCost} PLN</span>
          </div>
          <button 
            className="btn btn-success w-100 btn-lg" 
            onClick={handlePayment} 
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Przetwarzanie...
              </>
            ) : (
              "Zapłać teraz"
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default Cart;