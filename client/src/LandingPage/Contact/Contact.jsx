import React from 'react'
import "./Contact.css"
import msg_icon from '../../assets/msg-icon.png';
import mail_icon from '../../assets/mail-icon.png';
import phone_icon from '../../assets/phone-icon.png';
import location_icon from '../../assets/location-icon.png';
import white_arrow from "../../assets/white-arrow.png";
const Contact = () => {

  const [result, setResult] = React.useState("");

  const onSubmit = async (event) => {
    event.preventDefault();
    setResult("Sending....");
    const formData = new FormData(event.target);

    formData.append("access_key", "4f717ab0-2130-4229-9de5-fb2ab0e9b368");

    const response = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      body: formData
    });

    const data = await response.json();

    if (data.success) {
      setResult("Email Submitted Successfully");
      event.target.reset();
    } else {
      console.log("Error", data);
      setResult(data.message);
    }
  };




  return (
    <div className='contact'>
        <div className="contact-col">
            <h3>Send us a message <img src={msg_icon} alt="" /></h3>
            <p>We’d love to hear from you! Whether you have a question, feedback, or just want to say hello, feel free to reach out to us. Our team is here to assist you.</p>
            <ul>
                <li><img src={mail_icon} alt="" />finadvise@123.dev</li>
                <li><img src={phone_icon} alt="" />+91 7020053677</li>
                <li><img src={location_icon} alt="" />MIT AOE Pune<br/>Maharashtra</li>

            </ul>
        </div>

        <div className="contact-col">
          <form onSubmit={onSubmit}>
            <label>Your Name</label>
            <input type="text" name="name" placeholder="Enter your name" required/>
            <label>Phone Number</label>
            <input type="tel" name="phone" placeholder="Enter your mobile number" required/>
            <label>Write Your messages here</label>
            <textarea name="message" rows="6" placeholder="Enter Your message" required></textarea><textarea/>
            <button type="submit" className="btn dark-btn">Submit Now <img src={white_arrow} alt="" /></button>
          </form>
          <span>{result}</span>
        </div>

    </div>
  )
}

export default Contact